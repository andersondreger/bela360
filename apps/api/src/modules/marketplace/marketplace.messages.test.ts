// Fase 3 contra WhatsApp Cloud API e Resend SIMULADOS locais (nenhuma chamada real). Roda so com MK_TEST_DATABASE_URL.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import type { AddressInfo } from 'net';

const URL = process.env.MK_TEST_DATABASE_URL;
const d = URL ? describe : describe.skip;

d('marketplace mensagens (simulado)', () => {
  let svc: typeof import('./marketplace.service');
  let msg: typeof import('./messages.service');
  let prisma: typeof import('../../config').prisma;
  let fake: http.Server;
  let failWa = false;
  const calls: { url: string; auth?: string; body: any }[] = [];
  let bizOpt = '', bizNo = '', prod = '';

  beforeAll(async () => {
    fake = http.createServer((req, res) => {
      let raw = '';
      req.on('data', c => (raw += c));
      req.on('end', () => {
        calls.push({ url: req.url!, auth: req.headers.authorization, body: raw ? JSON.parse(raw) : {} });
        res.setHeader('content-type', 'application/json');
        if (req.url!.includes('/messages')) {
          if (failWa) { res.statusCode = 500; return res.end(JSON.stringify({ error: { message: 'boom' } })); }
          return res.end(JSON.stringify({ messages: [{ id: 'wamid.1' }] }));
        }
        res.end(JSON.stringify({ id: 'em_1' }));
      });
    });
    await new Promise<void>(r => fake.listen(0, r));
    const base = `http://127.0.0.1:${(fake.address() as AddressInfo).port}`;
    Object.assign(process.env, {
      DATABASE_URL: URL, NODE_ENV: 'development', JWT_SECRET: 'x'.repeat(32), JWT_REFRESH_SECRET: 'y'.repeat(32),
      EVOLUTION_API_KEY: 'k', ANTHROPIC_API_KEY: 'k', MARKETPLACE_GATEWAY: 'simulado', MARKETPLACE_MESSAGES: 'ativo',
      MARKETPLACE_WA_TOKEN: 'wa-token', MARKETPLACE_WA_PHONE_ID: '999', MARKETPLACE_WA_BASE_URL: base,
      MARKETPLACE_EMAIL_API_KEY: 'em-key', MARKETPLACE_EMAIL_FROM: 'loja@bela.test', MARKETPLACE_EMAIL_BASE_URL: base,
    });
    ({ prisma } = await import('../../config'));
    svc = await import('./marketplace.service');
    msg = await import('./messages.service');
    const t = Date.now();
    bizOpt = (await prisma.business.create({ data: { name: 'Com opt-in', slug: 'o' + t, phone: '11988887777', email: 'dona@clinica.test' } })).id;
    bizNo = (await prisma.business.create({ data: { name: 'Sem opt-in', slug: 'n' + t, phone: '11977776666', email: 'x@clinica.test' } })).id;
    const dist = await prisma.distributor.create({ data: { name: 'Dist', contact: 'vendas@dist.test', commissionBp: 1200, status: 'ATIVO', asaasWalletId: '11111111-1111-4111-8111-111111111111' } });
    prod = (await prisma.marketplaceProduct.create({ data: { distributorId: dist.id, name: 'P', category: 'CABELO', priceCents: 100_000 } })).id;
    await msg.setPref(bizOpt, 'user-1', { whatsappOptIn: true });
  });
  afterAll(() => { fake?.close(); });

  const buy = async (biz: string) => {
    const { checkout, orders } = await svc.createCheckout(biz, 't', [{ productId: prod, qty: 1 }], false);
    await svc.confirmCheckoutPaid(checkout.id);
    return orders[0].id;
  };
  const rows = (orderId: string) => prisma.marketplaceMessage.findMany({ where: { orderId }, orderBy: [{ type: 'asc' }, { channel: 'asc' }] });

  it('pagamento gera aviso ao cliente (WhatsApp so com opt-in) e ao distribuidor (so e-mail)', async () => {
    const id = await buy(bizOpt);
    const m = await rows(id);
    const get = (type: string, channel: string, audience: string) => m.find(x => x.type === type && x.channel === channel && x.audience === audience)!;
    expect(get('PEDIDO_PAGO', 'WHATSAPP', 'CLIENTE').status).toBe('PENDENTE');
    expect(get('PEDIDO_PAGO', 'EMAIL', 'CLIENTE').status).toBe('PENDENTE');
    expect(get('NOVO_PEDIDO', 'EMAIL', 'DISTRIBUIDOR').toAddress).toBe('vendas@dist.test');
    expect(get('NOVO_PEDIDO', 'WHATSAPP', 'DISTRIBUIDOR').status).toBe('IGNORADO');
  });

  it('sem opt-in: WhatsApp nunca e enviado (aceite LGPD), e-mail segue', async () => {
    const id = await buy(bizNo);
    const wa = (await rows(id)).find(x => x.type === 'PEDIDO_PAGO' && x.channel === 'WHATSAPP')!;
    expect(wa).toMatchObject({ status: 'IGNORADO', error: 'sem opt-in de WhatsApp' });
    calls.length = 0;
    await msg.dispatchPending();
    expect(calls.filter(c => c.url.includes('/messages') && c.body.to === '5511977776666')).toHaveLength(0);
  });

  it('envia por template oficial (parametros na ordem) e e-mail; segundo disparo nao reenvia', async () => {
    const id = await buy(bizOpt);
    calls.length = 0;
    await msg.dispatchPending();
    const wa = calls.filter(c => c.url.includes('/messages') && c.body.to === '5511988887777');
    expect(wa.length).toBeGreaterThan(0);
    const paid = wa.find(c => c.body.template.name === 'bela360_mk_pedido_pago')!;
    expect(paid.auth).toBe('Bearer wa-token');
    expect(paid.body).toMatchObject({ messaging_product: 'whatsapp', type: 'template', template: { language: { code: 'pt_BR' } } });
    expect(paid.body.template.components[0].parameters.map((p: any) => p.text)).toEqual(['Com opt-in', expect.any(String), 'R$ 1000,00']);
    expect((await rows(id)).filter(x => x.status === 'ENVIADO').length).toBeGreaterThanOrEqual(3);
    const n = calls.length;
    await msg.dispatchPending();
    expect(calls.length).toBe(n);
  });

  it('reprocessar o mesmo evento nao duplica mensagem (chave unica pedido+tipo+canal)', async () => {
    const id = await buy(bizOpt);
    const before = (await rows(id)).length;
    await msg.enqueueOrderMessages(id, 'PEDIDO_PAGO');
    await msg.enqueueOrderMessages(id, 'PEDIDO_PAGO');
    expect((await rows(id)).length).toBe(before);
  });

  it('falha do WhatsApp: tenta 3 vezes e marca FALHOU, sem afetar o pedido nem o e-mail', async () => {
    const id = await buy(bizOpt);
    failWa = true;
    for (let i = 0; i < 4; i++) await msg.dispatchPending();
    failWa = false;
    const m = await rows(id);
    const wa = m.find(x => x.type === 'PEDIDO_PAGO' && x.channel === 'WHATSAPP')!;
    expect(wa).toMatchObject({ status: 'FALHOU', attempts: 3 });
    expect(wa.error).toMatch(/boom/);
    expect(m.find(x => x.type === 'PEDIDO_PAGO' && x.channel === 'EMAIL')!.status).toBe('ENVIADO');
    expect((await prisma.marketplaceOrder.findUniqueOrThrow({ where: { id } })).status).toBe('PAGO');
  });

  it('enviado, entregue, cashback liberado e estorno geram seus avisos', async () => {
    const id = await buy(bizOpt);
    await svc.advanceOrder(id, 'ENVIADO');
    await svc.advanceOrder(id, 'ENTREGUE');
    await prisma.marketplaceOrder.update({ where: { id }, data: { releaseAt: new Date(Date.now() - 1000) } });
    await svc.releaseDueCashback();
    const types = (await rows(id)).filter(x => x.channel === 'EMAIL').map(x => x.type);
    expect(types).toEqual(expect.arrayContaining(['PEDIDO_PAGO', 'PEDIDO_ENVIADO', 'PEDIDO_ENTREGUE', 'CASHBACK_LIBERADO', 'NOVO_PEDIDO']));
    const id2 = await buy(bizOpt);
    await svc.refundOrder(id2, 'ceo');
    expect((await rows(id2)).some(x => x.type === 'PEDIDO_ESTORNADO' && x.channel === 'EMAIL')).toBe(true);
  });

  it('checkout nunca pago e cancelado nao avisa estorno; preferencias registram quem/quando; cliente so ve as proprias', async () => {
    const { orders } = await svc.createCheckout(bizOpt, 't', [{ productId: prod, qty: 1 }], false);
    await svc.refundOrder(orders[0].id, 'sistema');
    expect(await rows(orders[0].id)).toHaveLength(0);
    const pref = await msg.getPref(bizOpt);
    expect(pref).toMatchObject({ whatsappOptIn: true, whatsappOptInBy: 'user-1' });
    expect(pref!.whatsappOptInAt).toBeTruthy();
    const view = await msg.clientMessagesView(bizNo);
    expect(view.messages.every(x => x.id)).toBe(true);
    const mine = await prisma.marketplaceMessage.findMany({ where: { businessId: bizNo, audience: 'CLIENTE' } });
    expect(view.messages).toHaveLength(mine.length);
  });

  it('modo simulado so registra, sem rede', async () => {
    process.env.MARKETPLACE_MESSAGES = 'simulado';
    // env ja foi lido: o modo e validado no boot; aqui conferimos que o dispatcher respeita env.MARKETPLACE_MESSAGES
    const { env } = await import('../../config');
    (env as any).MARKETPLACE_MESSAGES = 'simulado';
    const id = await buy(bizOpt);
    calls.length = 0;
    await msg.dispatchPending();
    expect(calls).toHaveLength(0);
    expect((await rows(id)).filter(x => x.status === 'SIMULADO').length).toBeGreaterThanOrEqual(3);
    (env as any).MARKETPLACE_MESSAGES = 'ativo';
  });
});
