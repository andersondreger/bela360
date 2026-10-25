// Roda so com MK_TEST_DATABASE_URL (Postgres descartavel com as migrations aplicadas):
//   MK_TEST_DATABASE_URL=postgresql://... npx vitest run marketplace.integration
import { describe, it, expect, beforeAll } from 'vitest';

const URL = process.env.MK_TEST_DATABASE_URL;
const d = URL ? describe : describe.skip;

d('marketplace (banco real)', () => {
  let svc: typeof import('./marketplace.service');
  let prisma: typeof import('../../config').prisma;
  let bizA = '', bizB = '', dist = '', prod = '';

  beforeAll(async () => {
    Object.assign(process.env, {
      DATABASE_URL: URL, NODE_ENV: 'development', JWT_SECRET: 'x'.repeat(32), JWT_REFRESH_SECRET: 'y'.repeat(32),
      EVOLUTION_API_KEY: 'k', ANTHROPIC_API_KEY: 'k',
    });
    ({ prisma } = await import('../../config'));
    svc = await import('./marketplace.service');
    const mk = (n: string, phone: string) => prisma.business.create({ data: { name: n, slug: n + Date.now(), phone } });
    bizA = (await mk('a', '1' + Date.now())).id;
    bizB = (await mk('b', '2' + Date.now())).id;
    dist = (await prisma.distributor.create({ data: { name: 'D', commissionBp: 1200, status: 'ATIVO', asaasWalletId: 'w-1' } })).id;
    prod = (await prisma.marketplaceProduct.create({ data: { distributorId: dist, name: 'P', category: 'CABELO', priceCents: 100_000 } })).id;
  });

  it('catalogo omite distribuidor sem walletId (aceite 3)', async () => {
    const semWallet = await prisma.distributor.create({ data: { name: 'S', commissionBp: 1000, status: 'ATIVO' } });
    await prisma.marketplaceProduct.create({ data: { distributorId: semWallet.id, name: 'Oculto', category: 'CORPORAL', priceCents: 500 } });
    const names = (await svc.listCatalog({})).map(p => p.name);
    expect(names).toContain('P');
    expect(names).not.toContain('Oculto');
  });

  it('pedido de R$1.000 gera os valores do aceite 1 e ledger previsto', async () => {
    const { orders } = await svc.createCheckout(bizA, 't', [{ productId: prod, qty: 1 }], false);
    expect(orders[0]).toMatchObject({ paidCents: 100_000, commissionCents: 12_000, cashbackCents: 6_000, feeCents: 3_000 });
    expect((await svc.walletOf(bizA)).pendingCents).toBe(6_000);
  });

  it('confirmar pagamento duas vezes nao duplica nada (aceite 2)', async () => {
    const { checkout } = await svc.createCheckout(bizA, 't', [{ productId: prod, qty: 1 }], false);
    expect((await svc.confirmCheckoutPaid(checkout.id)).changed).toBe(true);
    expect((await svc.confirmCheckoutPaid(checkout.id)).changed).toBe(false);
  });

  it('libera cashback depois da entrega e do prazo, uma unica vez; saldo respeita o limite (aceite 5)', async () => {
    const { checkout, orders } = await svc.createCheckout(bizB, 't', [{ productId: prod, qty: 1 }], false);
    await svc.confirmCheckoutPaid(checkout.id);
    await svc.advanceOrder(orders[0].id, 'ENVIADO');
    await svc.advanceOrder(orders[0].id, 'ENTREGUE');
    expect((await svc.releaseDueCashback()).released).toBe(0); // prazo nao venceu
    const later = new Date(Date.now() + 8 * 86_400_000);
    expect((await svc.releaseDueCashback(later)).released).toBe(1);
    expect((await svc.releaseDueCashback(later)).released).toBe(0);
    expect((await svc.walletOf(bizB)).availableCents).toBe(6_000);
    const q = await svc.quoteCart(bizB, [{ productId: prod, qty: 1 }], true);
    expect(q.walletCents).toBe(6_000); // min(6.000 saldo, 30.000 limite)
    const big = await prisma.cashbackLedger.create({ data: { businessId: bizB, type: 'CASHBACK_LIBERADO', amountCents: 500_000, note: 'x' } });
    expect(big.id).toBeTruthy();
    expect((await svc.quoteCart(bizB, [{ productId: prod, qty: 1 }], true)).walletCents).toBe(30_000); // limite 30%
  });

  it('estorno cancela o cashback e devolve o saldo usado (aceite 4)', async () => {
    const before = (await svc.walletOf(bizB)).availableCents;
    const { checkout, orders } = await svc.createCheckout(bizB, 't', [{ productId: prod, qty: 1 }], true);
    expect((await svc.walletOf(bizB)).availableCents).toBe(before - 30_000);
    await svc.confirmCheckoutPaid(checkout.id);
    await svc.refundOrder(orders[0].id, 'ceo');
    await svc.refundOrder(orders[0].id, 'ceo'); // idempotente
    expect((await svc.walletOf(bizB)).availableCents).toBe(before);
    const o = await prisma.marketplaceOrder.findUnique({ where: { id: orders[0].id } });
    expect(o).toMatchObject({ status: 'ESTORNADO', splitStatus: 'ESTORNADO' });
  });

  it('nao estorna depois do cashback liberado sem aprovacao', async () => {
    const o = await prisma.marketplaceOrder.findFirstOrThrow({ where: { businessId: bizB, status: 'CASHBACK_LIBERADO' } });
    await expect(svc.refundOrder(o.id, 'ceo')).rejects.toThrow(/aprovacao/);
  });

  it('cliente nunca enxerga dados de outro cliente (aceite 6)', async () => {
    const a = await svc.listOrders(bizA, 'todos');
    expect(a.every(o => o.businessId === bizA)).toBe(true);
    const orderB = await prisma.marketplaceOrder.findFirstOrThrow({ where: { businessId: bizB } });
    await expect(svc.getOrder(bizA, orderB.id)).rejects.toThrow();
    expect((await svc.listLedger(bizA)).every(l => l.businessId === bizA)).toBe(true);
  });

  it('ledger e append-only no banco', async () => {
    const l = await prisma.cashbackLedger.findFirstOrThrow({ where: { businessId: bizA } });
    await expect(prisma.cashbackLedger.update({ where: { id: l.id }, data: { amountCents: 1 } })).rejects.toThrow(/append-only/);
    await expect(prisma.cashbackLedger.delete({ where: { id: l.id } })).rejects.toThrow(/append-only/);
  });
});
