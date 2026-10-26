import { Router, Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { env, prisma } from '../../config';
import { AuthorizationError, NotFoundError } from '../../common/errors';
import { authMiddleware } from '../../common/middleware/auth.middleware';
import * as svc from './marketplace.service';
import * as msg from './messages.service';
import { MESSAGE_TYPES } from './messages.templates';

const ok = (res: Response, data: unknown) => res.json({ success: true, data });
const wrap = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => {
  fn(req, res).then(d => (d === undefined ? undefined : ok(res, d))).catch(next);
};

// ---------------------------------------------------------------------------
// Area do cliente (tenant = businessId do token). Escrita so para dono e administrador.
// ---------------------------------------------------------------------------
export const marketplaceRoutes: Router = Router();

function requireBuyer(req: Request, _res: Response, next: NextFunction) {
  const role = req.user?.role;
  if (role !== 'OWNER' && role !== 'ADMIN') return next(new AuthorizationError('Somente dono ou administrador pode comprar no marketplace'));
  next();
}

const cartSchema = z.object({
  items: z.array(z.object({ productId: z.string().min(1), qty: z.number().int().min(1).max(999) })).min(1).max(100),
  useWallet: z.boolean().default(false),
});

marketplaceRoutes.get('/overview', wrap(async req => svc.clientOverview(req.user!.businessId)));

marketplaceRoutes.get('/messages', wrap(async req => msg.clientMessagesView(req.user!.businessId)));
// Consentimento: so dono/admin liga o WhatsApp (fica registrado quem e quando, para LGPD/Meta).
marketplaceRoutes.put('/messages/preferences', requireBuyer, wrap(async req => {
  const b = z.object({ whatsappOptIn: z.boolean().optional(), emailOptIn: z.boolean().optional() }).parse(req.body);
  await msg.setPref(req.user!.businessId, req.user!.userId, b);
  return msg.clientMessagesView(req.user!.businessId);
}));

marketplaceRoutes.get('/catalog', wrap(async req => {
  const q = z.object({ category: z.enum(['CABELO', 'ESTETICA_FACIAL', 'CORPORAL', 'DESCARTAVEIS', 'EQUIPAMENTOS']).optional(), q: z.string().max(80).optional() }).parse(req.query);
  return svc.listCatalog(q);
}));

marketplaceRoutes.post('/cart/quote', wrap(async req => {
  const b = cartSchema.parse(req.body);
  const q = await svc.quoteCart(req.user!.businessId, b.items, b.useWallet);
  return {
    grossCents: q.grossCents, walletCents: q.walletCents, paidCents: q.paidCents, cashbackCents: q.cashbackCents,
    availableCents: q.availableCents, maxWalletCents: q.maxWalletCents, walletLimitPct: q.rules.walletLimitPct,
    orders: q.orders.map(o => ({ distributor: o.distributor.name, subtotalCents: o.subtotalCents, walletUsedCents: o.walletUsedCents, paidCents: o.paidCents, cashbackCents: o.money.cashbackCents })),
  };
}));

// Cada checkout cria uma cobranca no gateway: teto por clinica (e nao por IP) para conter abuso/loop de front.
const checkoutLimiter = rateLimit({
  windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false,
  keyGenerator: req => `mk-checkout:${req.user?.businessId ?? 'anon'}`,
  handler: (_req, res) => res.status(429).json({ success: false, error: { message: 'Muitas tentativas de compra. Aguarde um minuto.' } }),
});

marketplaceRoutes.post('/checkout', requireBuyer, checkoutLimiter, wrap(async req => {
  const b = cartSchema.parse(req.body);
  const { checkout, orders } = await svc.createCheckout(req.user!.businessId, req.user!.userId, b.items, b.useWallet);
  return { checkoutId: checkout.id, paidCents: checkout.paidCents, gateway: checkout.gateway, invoiceUrl: checkout.invoiceUrl, orders: orders.map(o => ({ id: o.id, number: o.number })) };
}));

// Fase 1: gateway simulado. Na Fase 2 a confirmacao vem so do webhook do Asaas.
marketplaceRoutes.post('/checkout/:id/simulate-pay', requireBuyer, wrap(async req => {
  if (env.MARKETPLACE_GATEWAY !== 'simulado') throw new NotFoundError('Rota');
  const c = await prisma.marketplaceCheckout.findFirst({ where: { id: req.params.id, businessId: req.user!.businessId } });
  if (!c) throw new NotFoundError('Checkout');
  return svc.confirmCheckoutPaid(c.id);
}));

marketplaceRoutes.get('/orders', wrap(async req => {
  const f = z.enum(['todos', 'andamento', 'concluidos']).default('todos').parse(req.query.filter ?? 'todos');
  return svc.listOrders(req.user!.businessId, f);
}));
marketplaceRoutes.get('/orders/:id', wrap(async req => svc.getOrder(req.user!.businessId, req.params.id)));

marketplaceRoutes.get('/cashback', wrap(async req => {
  const [wallet, ledger] = await Promise.all([svc.walletOf(req.user!.businessId), svc.listLedger(req.user!.businessId)]);
  return { wallet, ledger };
}));
marketplaceRoutes.get('/finance', wrap(async req => svc.clientFinance(req.user!.businessId)));

// ---------------------------------------------------------------------------
// Visao CEO. Entra por: (a) usuario com isSuperAdmin ou (b) servico do wayia.com.br com
// x-service-token (a identidade do admin e validada la, no payments-api).
// ---------------------------------------------------------------------------
export const marketplaceAdminRoutes: Router = Router();

function tokenOk(given: string | undefined): boolean {
  const expected = env.MARKETPLACE_SERVICE_TOKEN;
  if (!expected || !given) return false;
  const a = Buffer.from(given), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function requireCeo(req: Request, res: Response, next: NextFunction) {
  try {
    const svcToken = req.headers['x-service-token'];
    if (typeof svcToken === 'string') {
      if (!tokenOk(svcToken)) throw new AuthorizationError('Token de servico invalido');
      (req as Request & { actor?: string }).actor = 'ceo-service';
      return next();
    }
    await new Promise<void>((resolve, reject) => authMiddleware(req, res, e => (e ? reject(e) : resolve())));
    const u = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { isSuperAdmin: true } });
    if (!u?.isSuperAdmin) throw new AuthorizationError('Somente o CEO acessa esta area');
    (req as Request & { actor?: string }).actor = req.user!.userId;
    next();
  } catch (e) { next(e); }
}
marketplaceAdminRoutes.use(requireCeo);
const actorOf = (req: Request) => (req as Request & { actor?: string }).actor ?? 'ceo';

marketplaceAdminRoutes.get('/finance', wrap(async () => svc.ceoFinance()));
marketplaceAdminRoutes.get('/orders', wrap(async () => svc.ceoOrders()));
marketplaceAdminRoutes.get('/clients', wrap(async () => svc.ceoClients()));
marketplaceAdminRoutes.get('/config', wrap(async () => svc.getRules()));
marketplaceAdminRoutes.get('/audit', wrap(async () => prisma.marketplaceAudit.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })));

marketplaceAdminRoutes.put('/config', wrap(async req => {
  const b = z.object({
    cashbackSharePct: z.number().int().min(0).max(100),
    walletLimitPct: z.number().int().min(0).max(100),
    returnDays: z.number().int().min(0).max(90),
    feeBp: z.number().int().min(0).max(3000),
  }).parse(req.body);
  return svc.updateRules(actorOf(req), b);
}));

const distributorSchema = z.object({
  name: z.string().min(2).max(120),
  contact: z.string().max(160).nullish(),
  commissionBp: z.number().int().min(0).max(10000),
  payDays: z.number().int().min(0).max(120).default(30),
  status: z.enum(['ATIVO', 'EM_NEGOCIACAO', 'PAUSADO']),
  asaasWalletId: z.string().trim().max(64).nullish(),
});
marketplaceAdminRoutes.get('/distributors', wrap(async () =>
  prisma.distributor.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { products: true } } } })));
marketplaceAdminRoutes.post('/distributors', wrap(async req =>
  svc.upsertDistributor(actorOf(req), null, distributorSchema.parse(req.body))));
marketplaceAdminRoutes.put('/distributors/:id', wrap(async req =>
  svc.upsertDistributor(actorOf(req), req.params.id, distributorSchema.parse(req.body))));

const productSchema = z.object({
  distributorId: z.string().min(1),
  name: z.string().min(2).max(160),
  category: z.enum(['CABELO', 'ESTETICA_FACIAL', 'CORPORAL', 'DESCARTAVEIS', 'EQUIPAMENTOS']),
  priceCents: z.number().int().min(1).max(100_000_000),
  imageUrl: z.string().url().nullish(),
  active: z.boolean().default(true),
});
marketplaceAdminRoutes.get('/products', wrap(async () =>
  prisma.marketplaceProduct.findMany({ orderBy: { name: 'asc' }, include: { distributor: { select: { id: true, name: true } } } })));
marketplaceAdminRoutes.post('/products', wrap(async req => prisma.marketplaceProduct.create({ data: productSchema.parse(req.body) })));
marketplaceAdminRoutes.put('/products/:id', wrap(async req => prisma.marketplaceProduct.update({ where: { id: req.params.id }, data: productSchema.parse(req.body) })));

marketplaceAdminRoutes.post('/orders/:id/advance', wrap(async req => {
  const to = z.enum(['ENVIADO', 'ENTREGUE']).parse(req.body?.to);
  return svc.advanceOrder(req.params.id, to);
}));
marketplaceAdminRoutes.post('/orders/:id/refund', wrap(async req => {
  const reason = z.string().max(300).optional().parse(req.body?.reason);
  return svc.refundOrderWithGateway(req.params.id, actorOf(req), reason);
}));
marketplaceAdminRoutes.post('/jobs/release-cashback', wrap(async () => svc.releaseDueCashback()));

marketplaceAdminRoutes.get('/messages', wrap(async () => msg.ceoMessagesView()));
marketplaceAdminRoutes.put('/messages/templates', wrap(async req => {
  const b = z.object({
    type: z.enum(MESSAGE_TYPES as [string, ...string[]]),
    channel: z.enum(['WHATSAPP', 'EMAIL']),
    body: z.string().trim().min(5).max(1000).optional(),
    waTemplateName: z.string().trim().regex(/^[a-z0-9_]{1,512}$/).nullish(),
    active: z.boolean().optional(),
  }).parse(req.body);
  return msg.upsertTemplate(b.type as any, b.channel, { body: b.body, waTemplateName: b.waTemplateName, active: b.active });
}));
marketplaceAdminRoutes.post('/jobs/dispatch-messages', wrap(async () => msg.dispatchPending()));

// Estorno de pedido com cashback ja liberado: pedido de aprovacao + decisao explicita.
marketplaceAdminRoutes.get('/refund-requests', wrap(async req => {
  const status = z.enum(['PENDENTE', 'APROVADO', 'REJEITADO']).optional().parse(req.query.status);
  return svc.listRefundRequests(status);
}));
marketplaceAdminRoutes.post('/refund-requests/:id/decide', wrap(async req => {
  const b = z.object({ decision: z.enum(['APROVAR', 'REJEITAR']), note: z.string().max(300).optional() }).parse(req.body);
  return svc.decideRefund(req.params.id, actorOf(req), b.decision, b.note);
}));
marketplaceAdminRoutes.post('/jobs/expire-checkouts', wrap(async () => svc.expireStaleCheckouts()));
