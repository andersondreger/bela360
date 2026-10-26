// Fase 4: RLS, estorno com aprovacao, expiracao de checkout e financeiro so com pedidos pagos. Exige banco VAZIO (MK_TEST_DATABASE_URL).
import { describe, it, expect, beforeAll } from 'vitest';

const URL = process.env.MK_TEST_DATABASE_URL;
const d = URL ? describe : describe.skip;

d('marketplace hardening', () => {
  let svc: typeof import('./marketplace.service');
  let hook: typeof import('./marketplace.webhook');
  let tenant: typeof import('./tenant');
  let prisma: typeof import('../../config').prisma;
  let A = '', B = '', prod = '';

  beforeAll(async () => {
    Object.assign(process.env, {
      DATABASE_URL: URL, NODE_ENV: 'development', JWT_SECRET: 'x'.repeat(32), JWT_REFRESH_SECRET: 'y'.repeat(32),
      EVOLUTION_API_KEY: 'k', ANTHROPIC_API_KEY: 'k', MARKETPLACE_GATEWAY: 'simulado', MARKETPLACE_MESSAGES: 'off',
    });
    ({ prisma } = await import('../../config'));
    svc = await import('./marketplace.service');
    hook = await import('./marketplace.webhook');
    tenant = await import('./tenant');
    const t = Date.now();
    A = (await prisma.business.create({ data: { name: 'A', slug: 'ha' + t, phone: '5' + t } })).id;
    B = (await prisma.business.create({ data: { name: 'B', slug: 'hb' + t, phone: '6' + t } })).id;
    const dist = await prisma.distributor.create({ data: { name: 'D', commissionBp: 1200, status: 'ATIVO', asaasWalletId: '11111111-1111-4111-8111-111111111111' } });
    prod = (await prisma.marketplaceProduct.create({ data: { distributorId: dist.id, name: 'P', category: 'CABELO', priceCents: 100_000 } })).id;
  });

  const buy = async (biz: string, pay = true) => {
    const { checkout, orders } = await svc.createCheckout(biz, 't', [{ productId: prod, qty: 1 }], false);
    if (pay) await svc.confirmCheckoutPaid(checkout.id);
    return { checkoutId: checkout.id, orderId: orders[0].id };
  };
  const release = async (orderId: string) => {
    await svc.advanceOrder(orderId, 'ENVIADO'); await svc.advanceOrder(orderId, 'ENTREGUE');
    await prisma.marketplaceOrder.update({ where: { id: orderId }, data: { releaseAt: new Date(Date.now() - 1000) } });
    await svc.releaseDueCashback();
  };

  it('RLS: mesmo SEM filtro por businessId, o papel do cliente so enxerga o proprio tenant; escrita e negada', async () => {
    const a = await buy(A), b = await buy(B);
    const orders = await tenant.tenantRead(A, tx => tx.marketplaceOrder.findMany({}));
    expect(orders.length).toBeGreaterThan(0);
    expect(orders.every(o => o.businessId === A)).toBe(true);
    expect(orders.some(o => o.id === b.orderId)).toBe(false);
    const ledger = await tenant.tenantRead(A, tx => tx.cashbackLedger.findMany({}));
    expect(ledger.every(l => l.businessId === A)).toBe(true);
    const items = await tenant.tenantRead(A, tx => tx.marketplaceOrderItem.findMany({}));
    expect(items.every(i => i.orderId !== b.orderId)).toBe(true);
    await expect(tenant.tenantRead(A, tx => tx.marketplaceOrder.update({ where: { id: a.orderId }, data: { subtotalCents: 1 } }))).rejects.toThrow();
    await expect(svc.getOrder(A, b.orderId)).rejects.toThrow(/Pedido/);
    // fora do tenantRead a aplicacao (papel dono) continua escrevendo normalmente
    expect((await prisma.marketplaceOrder.findUniqueOrThrow({ where: { id: a.orderId } })).subtotalCents).toBe(100_000);
  });

  it('financeiro do cliente e do CEO so conta pedido pago (pedido RECEBIDO nao vira venda)', async () => {
    const before = await svc.clientOverview(A);
    await buy(A, false);
    const after = await svc.clientOverview(A);
    expect(after.purchasedCents).toBe(before.purchasedCents);
    expect(after.inProgress).toBe(before.inProgress + 1);
    const fin = await svc.clientFinance(A);
    expect(fin.totals.purchasedCents).toBe(before.purchasedCents);
  });

  it('estorno de pedido com cashback liberado vira pedido de aprovacao; nada muda ate decidir', async () => {
    const { orderId } = await buy(A);
    await release(orderId);
    const w0 = await svc.walletOf(A);
    const r = await svc.refundOrderWithGateway(orderId, 'ceo', 'cliente devolveu');
    expect(r).toMatchObject({ pendingApproval: true });
    expect((await prisma.marketplaceOrder.findUniqueOrThrow({ where: { id: orderId } })).status).toBe('CASHBACK_LIBERADO');
    expect(await svc.walletOf(A)).toEqual(w0);
    // pedir de novo nao duplica
    const r2 = await svc.refundOrderWithGateway(orderId, 'ceo') as { requestId: string };
    expect(r2.requestId).toBe((r as { requestId: string }).requestId);
    const res = await svc.decideRefund((r as { requestId: string }).requestId, 'ceo', 'APROVAR', 'ok');
    expect(res.status).toBe('APROVADO');
    const o = await prisma.marketplaceOrder.findUniqueOrThrow({ where: { id: orderId } });
    expect(o).toMatchObject({ status: 'ESTORNADO', splitStatus: 'ESTORNADO' });
    const w1 = await svc.walletOf(A);
    expect(w1.availableCents).toBe(w0.availableCents - o.cashbackCents);
    expect(await prisma.cashbackLedger.count({ where: { orderId, type: 'CASHBACK_REVERTIDO' } })).toBe(1);
    await expect(svc.decideRefund((r as { requestId: string }).requestId, 'ceo', 'APROVAR')).rejects.toThrow(/ja foi decidido/);
    expect((await prisma.marketplaceAudit.count({ where: { entityId: orderId, action: 'order.refund.approved' } }))).toBe(1);
  });

  it('rejeitar mantem o pedido e o cashback; pode pedir de novo depois', async () => {
    const { orderId } = await buy(A);
    await release(orderId);
    const r = await svc.refundOrderWithGateway(orderId, 'ceo') as { requestId: string };
    await svc.decideRefund(r.requestId, 'ceo', 'REJEITAR', 'fora do prazo');
    expect((await prisma.marketplaceOrder.findUniqueOrThrow({ where: { id: orderId } })).status).toBe('CASHBACK_LIBERADO');
    const again = await svc.refundOrderWithGateway(orderId, 'ceo') as { requestId: string };
    expect(again.requestId).toBe(r.requestId);
    expect((await prisma.marketplaceRefundRequest.findUniqueOrThrow({ where: { id: r.requestId } })).status).toBe('PENDENTE');
  });

  it('webhook de estorno depois da liberacao abre pedido de aprovacao ja com o dinheiro devolvido (sem retry infinito)', async () => {
    const { orderId, checkoutId } = await buy(A);
    await release(orderId);
    await prisma.marketplaceCheckout.update({ where: { id: checkoutId }, data: { gatewayPaymentId: 'pay_h4_1' } });
    const evt = { id: 'evt_h4_1', event: 'PAYMENT_REFUNDED', payment: { id: 'pay_h4_1' } };
    expect(await hook.processAsaasEvent(evt)).toBe('processed');
    expect(await hook.processAsaasEvent(evt)).toBe('duplicate');
    const req = await prisma.marketplaceRefundRequest.findUniqueOrThrow({ where: { orderId } });
    expect(req).toMatchObject({ status: 'PENDENTE', source: 'GATEWAY', gatewayRefunded: true });
    expect((await prisma.marketplaceOrder.findUniqueOrThrow({ where: { id: orderId } })).status).toBe('CASHBACK_LIBERADO');
  });

  it('checkout pendente antigo expira e devolve o saldo; o recente fica', async () => {
    const old = await buy(B, false), fresh = await buy(B, false);
    await prisma.marketplaceCheckout.update({ where: { id: old.checkoutId }, data: { createdAt: new Date(Date.now() - 80 * 3_600_000) } });
    const r = await svc.expireStaleCheckouts();
    expect(r.expired).toBeGreaterThanOrEqual(1);
    expect((await prisma.marketplaceCheckout.findUniqueOrThrow({ where: { id: old.checkoutId } })).status).toBe('CANCELADO');
    expect((await prisma.marketplaceOrder.findUniqueOrThrow({ where: { id: old.orderId } })).status).toBe('ESTORNADO');
    expect((await prisma.marketplaceCheckout.findUniqueOrThrow({ where: { id: fresh.checkoutId } })).status).toBe('PENDENTE');
  });
});
