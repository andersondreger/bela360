import { Prisma, MarketplaceOrderStatus, LedgerType } from '@prisma/client';
import { prisma } from '../../config';
import { ConflictError, NotFoundError, ValidationError } from '../../common/errors';
import {
  DEFAULT_RULES, MarketplaceRules, allocateDiscount, balanceOf, distributorSellable, orderMoney,
  releaseDate, walletUsable, LedgerEntry,
} from './rules';

type Tx = Prisma.TransactionClient;

export async function getRules(db: Tx | typeof prisma = prisma): Promise<MarketplaceRules> {
  const c = await db.marketplaceConfig.findUnique({ where: { id: 'default' } });
  return c
    ? { cashbackSharePct: c.cashbackSharePct, walletLimitPct: c.walletLimitPct, returnDays: c.returnDays, feeBp: c.feeBp }
    : DEFAULT_RULES;
}

export async function audit(db: Tx | typeof prisma, actor: string, action: string, entity: string, entityId?: string, before?: unknown, after?: unknown) {
  await db.marketplaceAudit.create({
    data: {
      actor, action, entity, entityId,
      before: before === undefined ? undefined : (before as Prisma.InputJsonValue),
      after: after === undefined ? undefined : (after as Prisma.InputJsonValue),
    },
  });
}

// ---------- ledger / carteira ----------

async function ledgerEntries(db: Tx | typeof prisma, businessId: string): Promise<LedgerEntry[]> {
  const rows = await db.cashbackLedger.findMany({ where: { businessId }, select: { type: true, amountCents: true } });
  return rows;
}

export async function walletOf(businessId: string) {
  return balanceOf(await ledgerEntries(prisma, businessId));
}

/** Grava um lancamento; se o par (pedido, tipo) ja existe, ignora (idempotencia). */
async function postLedger(tx: Tx, e: { businessId: string; orderId: string; type: LedgerType; amountCents: number; note: string }): Promise<boolean> {
  if (e.amountCents <= 0) return false;
  try {
    await tx.cashbackLedger.create({ data: e });
    return true;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return false;
    throw err;
  }
}

// ---------- catalogo ----------

export async function listCatalog(filter: { category?: string; q?: string }) {
  const rules = await getRules();
  const products = await prisma.marketplaceProduct.findMany({
    where: {
      active: true,
      distributor: { status: 'ATIVO', asaasWalletId: { not: null } },
      ...(filter.category ? { category: filter.category as never } : {}),
      ...(filter.q ? { name: { contains: filter.q, mode: 'insensitive' } } : {}),
    },
    include: { distributor: { select: { id: true, name: true, commissionBp: true, status: true, asaasWalletId: true } } },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });
  // Dupla checagem em codigo (walletId vazio "  " passa pelo filtro do banco).
  return products
    .filter(p => distributorSellable(p.distributor))
    .map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      priceCents: p.priceCents,
      imageUrl: p.imageUrl,
      distributor: { id: p.distributor.id, name: p.distributor.name },
      cashbackCents: orderMoney(p.priceCents, p.distributor.commissionBp, rules).cashbackCents,
    }));
}

// ---------- checkout ----------

export interface CartItem { productId: string; qty: number }

/** Recalcula o carrinho no servidor (preco e comissao nunca vem do front). */
export async function quoteCart(businessId: string, items: CartItem[], useWallet: boolean, db: Tx | typeof prisma = prisma) {
  if (!items.length) throw new ValidationError('Carrinho vazio');
  const rules = await getRules(db);
  const ids = [...new Set(items.map(i => i.productId))];
  const products = await db.marketplaceProduct.findMany({ where: { id: { in: ids }, active: true }, include: { distributor: true } });
  const byId = new Map(products.map(p => [p.id, p]));

  const groups = new Map<string, { distributor: (typeof products)[number]['distributor']; lines: { productId: string; name: string; qty: number; priceCents: number }[] }>();
  for (const it of items) {
    const p = byId.get(it.productId);
    if (!p) throw new ValidationError('Produto indisponivel no carrinho');
    if (!distributorSellable(p.distributor)) throw new ConflictError(`${p.distributor.name} esta indisponivel no momento`);
    const g = groups.get(p.distributorId) ?? { distributor: p.distributor, lines: [] };
    g.lines.push({ productId: p.id, name: p.name, qty: it.qty, priceCents: p.priceCents });
    groups.set(p.distributorId, g);
  }

  const list = [...groups.values()].map(g => ({ ...g, subtotalCents: g.lines.reduce((a, l) => a + l.priceCents * l.qty, 0) }));
  const grossCents = list.reduce((a, g) => a + g.subtotalCents, 0);
  const available = balanceOf(await ledgerEntries(db, businessId)).availableCents;
  const walletCents = useWallet ? walletUsable(grossCents, available, rules.walletLimitPct) : 0;
  const discounts = allocateDiscount(list.map(g => g.subtotalCents), walletCents);

  const orders = list.map((g, i) => {
    const paidCents = g.subtotalCents - discounts[i];
    return { ...g, walletUsedCents: discounts[i], paidCents, money: orderMoney(paidCents, g.distributor.commissionBp, rules) };
  });
  return {
    rules, grossCents, walletCents, paidCents: grossCents - walletCents, availableCents: available,
    maxWalletCents: walletUsable(grossCents, available, rules.walletLimitPct),
    cashbackCents: orders.reduce((a, o) => a + o.money.cashbackCents, 0),
    orders,
  };
}

export async function createCheckout(businessId: string, actor: string, items: CartItem[], useWallet: boolean) {
  return prisma.$transaction(async tx => {
    // Trava a linha do tenant: duas compras simultaneas nao gastam o mesmo saldo duas vezes.
    await tx.$queryRaw`SELECT id FROM businesses WHERE id = ${businessId} FOR UPDATE`;
    const q = await quoteCart(businessId, items, useWallet, tx);

    const checkout = await tx.marketplaceCheckout.create({
      data: { businessId, grossCents: q.grossCents, walletUsedCents: q.walletCents, paidCents: q.paidCents },
    });
    const created = [];
    for (const o of q.orders) {
      const order = await tx.marketplaceOrder.create({
        data: {
          checkoutId: checkout.id, businessId, distributorId: o.distributor.id,
          subtotalCents: o.subtotalCents, walletUsedCents: o.walletUsedCents, paidCents: o.paidCents,
          commissionBp: o.distributor.commissionBp, commissionCents: o.money.commissionCents,
          cashbackCents: o.money.cashbackCents, feeCents: o.money.feeCents,
          items: { create: o.lines.map(l => ({ productId: l.productId, name: l.name, qty: l.qty, priceCents: l.priceCents })) },
        },
      });
      await postLedger(tx, { businessId, orderId: order.id, type: 'CASHBACK_PREVISTO', amountCents: o.money.cashbackCents, note: `Cashback do pedido #${order.number}` });
      await postLedger(tx, { businessId, orderId: order.id, type: 'USO_DE_SALDO', amountCents: o.walletUsedCents, note: `Saldo usado no pedido #${order.number}` });
      created.push(order);
    }
    await audit(tx, actor, 'checkout.create', 'checkout', checkout.id, undefined, { grossCents: q.grossCents, walletCents: q.walletCents });
    return { checkout, orders: created };
  });
}

/** Pagamento confirmado (webhook na Fase 2; simulacao na Fase 1). Idempotente. */
export async function confirmCheckoutPaid(checkoutId: string): Promise<{ changed: boolean }> {
  return prisma.$transaction(async tx => {
    const c = await tx.marketplaceCheckout.findUnique({ where: { id: checkoutId } });
    if (!c) throw new NotFoundError('Checkout');
    if (c.status !== 'PENDENTE') return { changed: false };
    const now = new Date();
    await tx.marketplaceCheckout.update({ where: { id: c.id }, data: { status: 'PAGO', paidAt: now } });
    await tx.marketplaceOrder.updateMany({
      where: { checkoutId: c.id, status: 'RECEBIDO' },
      data: { status: 'PAGO', paidAt: now, splitStatus: c.gateway === 'simulado' ? 'LIQUIDADO' : 'AGUARDANDO' },
    });
    return { changed: true };
  });
}

// ---------- ciclo do pedido (CEO / distribuidor) ----------

export async function advanceOrder(orderId: string, to: 'ENVIADO' | 'ENTREGUE') {
  return prisma.$transaction(async tx => {
    const o = await tx.marketplaceOrder.findUnique({ where: { id: orderId } });
    if (!o) throw new NotFoundError('Pedido');
    const rules = await getRules(tx);
    const now = new Date();
    if (to === 'ENVIADO') {
      if (o.status !== 'PAGO') throw new ConflictError('So pedidos pagos podem ser enviados');
      return tx.marketplaceOrder.update({ where: { id: o.id }, data: { status: 'ENVIADO', shippedAt: now } });
    }
    if (o.status !== 'ENVIADO') throw new ConflictError('So pedidos enviados podem ser marcados como entregues');
    return tx.marketplaceOrder.update({
      where: { id: o.id },
      data: { status: 'ENTREGUE', deliveredAt: now, releaseAt: releaseDate(now, rules.returnDays) },
    });
  });
}

/** Job diario: libera o cashback dos pedidos entregues cujo prazo de devolucao venceu. */
export async function releaseDueCashback(now = new Date()): Promise<{ released: number }> {
  const due = await prisma.marketplaceOrder.findMany({ where: { status: 'ENTREGUE', releaseAt: { lte: now } }, select: { id: true } });
  let released = 0;
  for (const { id } of due) {
    await prisma.$transaction(async tx => {
      const o = await tx.marketplaceOrder.findUnique({ where: { id } });
      if (!o || o.status !== 'ENTREGUE') return;
      const ok = await postLedger(tx, { businessId: o.businessId, orderId: o.id, type: 'CASHBACK_LIBERADO', amountCents: o.cashbackCents, note: `Cashback liberado do pedido #${o.number}` });
      await tx.marketplaceOrder.update({ where: { id: o.id }, data: { status: 'CASHBACK_LIBERADO', releasedAt: now } });
      if (ok) released++;
    });
  }
  return { released };
}

/** Estorno: desfaz o split, cancela o cashback a liberar e devolve o saldo usado. */
export async function refundOrder(orderId: string, actor: string, reason?: string) {
  return prisma.$transaction(async tx => {
    const o = await tx.marketplaceOrder.findUnique({ where: { id: orderId } });
    if (!o) throw new NotFoundError('Pedido');
    if (o.status === 'ESTORNADO') return o; // idempotente
    if (o.status === 'CASHBACK_LIBERADO') {
      throw new ConflictError('Cashback ja liberado: estorno exige fluxo de aprovacao (nao disponivel nesta versao)');
    }
    await postLedger(tx, { businessId: o.businessId, orderId: o.id, type: 'CANCELAMENTO', amountCents: o.cashbackCents, note: `Cashback cancelado: pedido #${o.number} estornado` });
    await postLedger(tx, { businessId: o.businessId, orderId: o.id, type: 'ESTORNO', amountCents: o.walletUsedCents, note: `Saldo devolvido: pedido #${o.number} estornado` });
    const updated = await tx.marketplaceOrder.update({ where: { id: o.id }, data: { status: 'ESTORNADO', splitStatus: 'ESTORNADO', refundedAt: new Date() } });
    const open = await tx.marketplaceOrder.count({ where: { checkoutId: o.checkoutId, status: { not: 'ESTORNADO' } } });
    if (open === 0) await tx.marketplaceCheckout.update({ where: { id: o.checkoutId }, data: { status: 'ESTORNADO' } });
    await audit(tx, actor, 'order.refund', 'order', o.id, { status: o.status }, { status: 'ESTORNADO', reason });
    return updated;
  });
}

// ---------- leitura do cliente (sempre filtrada por businessId) ----------

const orderInclude = { items: true, distributor: { select: { id: true, name: true } } } satisfies Prisma.MarketplaceOrderInclude;

export async function listOrders(businessId: string, filter: 'todos' | 'andamento' | 'concluidos') {
  const status: MarketplaceOrderStatus[] | undefined =
    filter === 'andamento' ? ['RECEBIDO', 'PAGO', 'ENVIADO', 'ENTREGUE']
    : filter === 'concluidos' ? ['CASHBACK_LIBERADO'] : undefined;
  return prisma.marketplaceOrder.findMany({
    where: { businessId, ...(status ? { status: { in: status } } : {}) },
    include: orderInclude,
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
}

export async function getOrder(businessId: string, orderId: string) {
  const o = await prisma.marketplaceOrder.findFirst({ where: { id: orderId, businessId }, include: orderInclude });
  if (!o) throw new NotFoundError('Pedido');
  return o;
}

export async function listLedger(businessId: string) {
  return prisma.cashbackLedger.findMany({ where: { businessId }, orderBy: { createdAt: 'desc' }, take: 300, include: { order: { select: { number: true } } } });
}

/** Area financeira do PROPRIO cliente: o que comprou, quanto voltou, quanto falta liberar. */
export async function clientFinance(businessId: string) {
  const [orders, wallet] = await Promise.all([
    prisma.marketplaceOrder.findMany({ where: { businessId }, include: { distributor: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } }),
    walletOf(businessId),
  ]);
  const live = orders.filter(o => o.status !== 'ESTORNADO');
  const byDist = new Map<string, { id: string; name: string; orders: number; paidCents: number; cashbackCents: number }>();
  for (const o of live) {
    const d = byDist.get(o.distributorId) ?? { id: o.distributorId, name: o.distributor.name, orders: 0, paidCents: 0, cashbackCents: 0 };
    d.orders++; d.paidCents += o.paidCents; d.cashbackCents += o.cashbackCents;
    byDist.set(o.distributorId, d);
  }
  return {
    totals: {
      purchasedCents: live.reduce((a, o) => a + o.paidCents, 0),
      walletUsedCents: live.reduce((a, o) => a + o.walletUsedCents, 0),
      cashbackEarnedCents: live.reduce((a, o) => a + o.cashbackCents, 0),
      refundedCents: orders.filter(o => o.status === 'ESTORNADO').reduce((a, o) => a + o.paidCents, 0),
    },
    wallet,
    byDistributor: [...byDist.values()],
    orders: orders.map(o => ({
      id: o.id, number: o.number, createdAt: o.createdAt, status: o.status, splitStatus: o.splitStatus,
      distributor: o.distributor.name, paidCents: o.paidCents, walletUsedCents: o.walletUsedCents,
      cashbackCents: o.cashbackCents, releaseAt: o.releaseAt,
    })),
  };
}

export async function clientOverview(businessId: string) {
  const rules = await getRules();
  const [wallet, orders] = await Promise.all([
    walletOf(businessId),
    prisma.marketplaceOrder.findMany({ where: { businessId }, include: orderInclude, orderBy: { createdAt: 'desc' } }),
  ]);
  const live = orders.filter(o => o.status !== 'ESTORNADO');
  const commissionCents = live.reduce((a, o) => a + o.commissionCents, 0);
  const cashbackCents = live.reduce((a, o) => a + o.cashbackCents, 0);
  return {
    wallet,
    rules: { cashbackSharePct: rules.cashbackSharePct, walletLimitPct: rules.walletLimitPct, returnDays: rules.returnDays },
    inProgress: live.filter(o => o.status !== 'CASHBACK_LIBERADO').length,
    purchasedCents: live.reduce((a, o) => a + o.paidCents, 0),
    commissionSplit: { toClientCents: cashbackCents, toBelaCents: commissionCents - cashbackCents },
    recent: orders.slice(0, 3),
  };
}

// ---------- visao CEO (plataforma inteira) ----------

export async function ceoFinance() {
  const orders = await prisma.marketplaceOrder.findMany({ include: { distributor: { select: { id: true, name: true } }, business: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } });
  const live = orders.filter(o => o.status !== 'ESTORNADO');
  const sum = (f: (o: (typeof live)[number]) => number) => live.reduce((a, o) => a + f(o), 0);
  const grossCents = sum(o => o.paidCents);
  const commissionCents = sum(o => o.commissionCents);
  const feeCents = sum(o => o.feeCents);
  const cashbackCents = sum(o => o.cashbackCents);
  const reserveCents = live.filter(o => o.status !== 'CASHBACK_LIBERADO').reduce((a, o) => a + o.cashbackCents, 0);
  const byDist = new Map<string, { id: string; name: string; orders: number; grossCents: number; toDistributorCents: number; commissionCents: number }>();
  for (const o of live) {
    const d = byDist.get(o.distributorId) ?? { id: o.distributorId, name: o.distributor.name, orders: 0, grossCents: 0, toDistributorCents: 0, commissionCents: 0 };
    d.orders++; d.grossCents += o.paidCents; d.toDistributorCents += o.paidCents - o.commissionCents; d.commissionCents += o.commissionCents;
    byDist.set(o.distributorId, d);
  }
  return {
    totals: {
      grossCents, toDistributorsCents: grossCents - commissionCents, commissionCents, feeCents,
      netCommissionCents: commissionCents - feeCents, cashbackCents,
      netRevenueCents: commissionCents - feeCents - cashbackCents,
      cashbackReserveCents: reserveCents,
      orders: live.length, refunded: orders.length - live.length,
    },
    byDistributor: [...byDist.values()],
    orders: orders.slice(0, 200).map(o => ({
      id: o.id, number: o.number, createdAt: o.createdAt, status: o.status, splitStatus: o.splitStatus,
      business: o.business.name, distributor: o.distributor.name, paidCents: o.paidCents,
      toDistributorCents: o.paidCents - o.commissionCents, commissionCents: o.commissionCents,
      feeCents: o.feeCents, cashbackCents: o.cashbackCents,
      netRevenueCents: o.commissionCents - o.feeCents - o.cashbackCents,
    })),
  };
}

export async function ceoOrders(take = 100) {
  return prisma.marketplaceOrder.findMany({ include: { ...orderInclude, business: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' }, take });
}

export async function ceoClients() {
  const [businesses, ledger, orders] = await Promise.all([
    prisma.business.findMany({ where: { mkOrders: { some: {} } }, select: { id: true, name: true } }),
    prisma.cashbackLedger.groupBy({ by: ['businessId', 'type'], _sum: { amountCents: true } }),
    prisma.marketplaceOrder.groupBy({ by: ['businessId'], where: { status: { not: 'ESTORNADO' } }, _sum: { paidCents: true }, _count: true }),
  ]);
  return businesses.map(b => {
    const entries = ledger.filter(l => l.businessId === b.id).map(l => ({ type: l.type, amountCents: l._sum.amountCents ?? 0 }));
    const ord = orders.find(o => o.businessId === b.id);
    return { id: b.id, name: b.name, orders: ord?._count ?? 0, purchasedCents: ord?._sum.paidCents ?? 0, wallet: balanceOf(entries) };
  });
}

// ---------- admin: distribuidores, produtos, regras ----------

export async function upsertDistributor(actor: string, id: string | null, data: Prisma.DistributorUncheckedCreateInput) {
  if (data.status === 'ATIVO' && !data.asaasWalletId?.trim()) {
    throw new ValidationError('Para ativar o distribuidor, informe o walletId do Asaas');
  }
  if (id) {
    const before = await prisma.distributor.findUnique({ where: { id } });
    if (!before) throw new NotFoundError('Distribuidor');
    const after = await prisma.distributor.update({ where: { id }, data });
    await audit(prisma, actor, 'distributor.update', 'distributor', id, before, after);
    return after;
  }
  const created = await prisma.distributor.create({ data });
  await audit(prisma, actor, 'distributor.create', 'distributor', created.id, undefined, created);
  return created;
}

export async function updateRules(actor: string, next: MarketplaceRules) {
  const before = await getRules();
  const after = await prisma.marketplaceConfig.upsert({ where: { id: 'default' }, update: next, create: { id: 'default', ...next } });
  await audit(prisma, actor, 'config.update', 'config', 'default', before, next);
  return after;
}
