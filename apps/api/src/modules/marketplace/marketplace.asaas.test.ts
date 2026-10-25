// Fase 2 contra um Asaas SIMULADO local (nenhuma chamada real). Roda so com MK_TEST_DATABASE_URL.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import type { AddressInfo } from 'net';

const URL = process.env.MK_TEST_DATABASE_URL;
const d = URL ? describe : describe.skip;
const TOKEN = 'webhook-token-with-more-than-24-chars';

d('marketplace + Asaas (simulado)', () => {
  let svc: typeof import('./marketplace.service');
  let hook: typeof import('./marketplace.webhook');
  let prisma: typeof import('../../config').prisma;
  let fake: http.Server;
  const calls: { method: string; url: string; body: any }[] = [];
  let bizOk = '', bizNoDoc = '', prodA = '', prodB = '';
  const W1 = '11111111-1111-4111-8111-111111111111', W2 = '22222222-2222-4222-8222-222222222222';
  let evtN = 0;
  const evt = (event: string, paymentId: string, extra: object = {}, id = `evt_${++evtN}`) => ({ id, event, payment: { id: paymentId, ...extra } });

  beforeAll(async () => {
    fake = http.createServer((req, res) => {
      let raw = '';
      req.on('data', c => (raw += c));
      req.on('end', () => {
        const body = raw ? JSON.parse(raw) : {};
        calls.push({ method: req.method!, url: req.url!, body });
        res.setHeader('content-type', 'application/json');
        if (req.method === 'GET' && req.url!.startsWith('/customers')) return res.end(JSON.stringify({ data: [] }));
        if (req.url === '/customers') return res.end(JSON.stringify({ id: 'cus_1' }));
        if (req.url === '/payments') {
          const n = calls.filter(c => c.url === '/payments').length;
          return res.end(JSON.stringify({ id: `pay_${n}`, invoiceUrl: `https://sandbox/i/${n}`, netValue: body.value * 0.97 }));
        }
        res.end('{}');
      });
    });
    await new Promise<void>(r => fake.listen(0, r));
    Object.assign(process.env, {
      DATABASE_URL: URL, NODE_ENV: 'development', JWT_SECRET: 'x'.repeat(32), JWT_REFRESH_SECRET: 'y'.repeat(32),
      EVOLUTION_API_KEY: 'k', ANTHROPIC_API_KEY: 'k', MARKETPLACE_GATEWAY: 'asaas', MARKETPLACE_ASAAS_API_KEY: 'sandbox-key',
      MARKETPLACE_ASAAS_BASE_URL: `http://127.0.0.1:${(fake.address() as AddressInfo).port}`, MARKETPLACE_ASAAS_WEBHOOK_TOKEN: TOKEN,
    });
    ({ prisma } = await import('../../config'));
    svc = await import('./marketplace.service');
    hook = await import('./marketplace.webhook');
    const mk = (n: string, phone: string, document?: string) => prisma.business.create({ data: { name: n, slug: n + Date.now(), phone, document } });
    bizOk = (await mk('ok', '3' + Date.now(), '12345678909')).id;
    bizNoDoc = (await mk('nodoc', '4' + Date.now())).id;
    const dA = await prisma.distributor.create({ data: { name: 'A', commissionBp: 1200, status: 'ATIVO', asaasWalletId: W1 } });
    const dB = await prisma.distributor.create({ data: { name: 'B', commissionBp: 1000, status: 'ATIVO', asaasWalletId: W2 } });
    prodA = (await prisma.marketplaceProduct.create({ data: { distributorId: dA.id, name: 'PA', category: 'CABELO', priceCents: 100_000 } })).id;
    prodB = (await prisma.marketplaceProduct.create({ data: { distributorId: dB.id, name: 'PB', category: 'CORPORAL', priceCents: 50_000 } })).id;
  });
  afterAll(() => { fake?.close(); });

  it('cria UM pagamento com split por distribuidor (preco - comissao), sem carteira da Bela', async () => {
    const { checkout, orders } = await svc.createCheckout(bizOk, 't', [{ productId: prodA, qty: 1 }, { productId: prodB, qty: 1 }], false);
    expect(orders).toHaveLength(2);
    const pays = calls.filter(c => c.url === '/payments');
    expect(pays).toHaveLength(1);
    const b = pays[0].body;
    expect(b.value).toBe(1500);
    expect(b.externalReference).toBe(checkout.id);
    expect(b.split).toEqual(expect.arrayContaining([{ walletId: W1, fixedValue: 880 }, { walletId: W2, fixedValue: 450 }]));
    expect(b.split).toHaveLength(2);
    expect(checkout.gatewayPaymentId).toBeTruthy();
  });

  it('sem CPF/CNPJ do cliente: nada e cobrado, pedido desfeito e saldo intacto', async () => {
    const before = calls.filter(c => c.url === '/payments').length;
    await expect(svc.createCheckout(bizNoDoc, 't', [{ productId: prodA, qty: 1 }], false)).rejects.toThrow(/CPF\/CNPJ/);
    expect(calls.filter(c => c.url === '/payments').length).toBe(before);
    const o = await prisma.marketplaceOrder.findFirstOrThrow({ where: { businessId: bizNoDoc } });
    expect(o.status).toBe('ESTORNADO');
    expect((await svc.walletOf(bizNoDoc)).pendingCents).toBe(0);
  });

  it('webhook: confirmado -> pago; recebido -> split liquidado; mesmo evento duas vezes nao duplica (aceite 2)', async () => {
    const { checkout } = await svc.createCheckout(bizOk, 't', [{ productId: prodA, qty: 1 }], false);
    const pid = checkout.gatewayPaymentId!;
    const confirmed = evt('PAYMENT_CONFIRMED', pid, { netValue: 970 });
    expect(await hook.processAsaasEvent(confirmed)).toBe('processed');
    expect(await hook.processAsaasEvent(confirmed)).toBe('duplicate');
    let o = await prisma.marketplaceOrder.findFirstOrThrow({ where: { checkoutId: checkout.id } });
    expect(o).toMatchObject({ status: 'PAGO', splitStatus: 'AGUARDANDO', feeCents: 3000 });
    const received = evt('PAYMENT_RECEIVED', pid, { netValue: 970 });
    await hook.processAsaasEvent(received);
    await hook.processAsaasEvent(received);
    o = await prisma.marketplaceOrder.findFirstOrThrow({ where: { checkoutId: checkout.id } });
    expect(o.splitStatus).toBe('LIQUIDADO');
    expect(await prisma.cashbackLedger.count({ where: { orderId: o.id, type: 'CASHBACK_PREVISTO' } })).toBe(1);
    expect(await prisma.marketplaceWebhookEvent.count({ where: { id: received.id } })).toBe(1);
  });

  it('webhook de estorno cancela cashback e devolve saldo usado (aceite 4), de forma idempotente', async () => {
    await prisma.cashbackLedger.create({ data: { businessId: bizOk, type: 'CASHBACK_LIBERADO', amountCents: 40_000, note: 'seed' } });
    const before = (await svc.walletOf(bizOk)).availableCents;
    const { checkout, orders } = await svc.createCheckout(bizOk, 't', [{ productId: prodA, qty: 1 }], true);
    expect((await svc.walletOf(bizOk)).availableCents).toBeLessThan(before);
    const pid = checkout.gatewayPaymentId!;
    await hook.processAsaasEvent(evt('PAYMENT_RECEIVED', pid));
    await hook.processAsaasEvent(evt('PAYMENT_REFUNDED', pid));
    await hook.processAsaasEvent(evt('PAYMENT_REFUNDED', pid)); // outro id, mesmo efeito
    const o = await prisma.marketplaceOrder.findUniqueOrThrow({ where: { id: orders[0].id } });
    expect(o).toMatchObject({ status: 'ESTORNADO', splitStatus: 'ESTORNADO' });
    expect((await svc.walletOf(bizOk)).availableCents).toBe(before);
  });

  it('cobranca expirada sem pagamento cancela o checkout e devolve o saldo', async () => {
    const before = (await svc.walletOf(bizOk)).availableCents;
    const { checkout } = await svc.createCheckout(bizOk, 't', [{ productId: prodA, qty: 1 }], true);
    await hook.processAsaasEvent(evt('PAYMENT_OVERDUE', checkout.gatewayPaymentId!));
    expect((await prisma.marketplaceCheckout.findUniqueOrThrow({ where: { id: checkout.id } })).status).toBe('CANCELADO');
    expect((await svc.walletOf(bizOk)).availableCents).toBe(before);
  });

  it('evento de cobranca desconhecida (ex.: assinatura SaaS) e so registrado', async () => {
    expect(await hook.processAsaasEvent(evt('PAYMENT_RECEIVED', 'pay_de_outro_produto'))).toBe('ignored');
  });

  it('rota do webhook recusa token invalido e aceita o certo', async () => {
    const { app } = await import('../../app');
    const srv = app.listen(0);
    const port = (srv.address() as AddressInfo).port;
    const post = (token?: string) => fetch(`http://127.0.0.1:${port}/api/marketplace/webhooks/asaas`, {
      method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { 'asaas-access-token': token } : {}) }, body: JSON.stringify(evt('PAYMENT_CREATED', 'x')),
    });
    expect((await post()).status).toBe(401);
    expect((await post('errado')).status).toBe(401);
    expect((await post(TOKEN)).status).toBe(200);
    srv.close();
  });
});
