import { Router, Request, Response } from 'express';
import { timingSafeEqual } from 'crypto';
import { Prisma } from '@prisma/client';
import { env, prisma, logger } from '../../config';
import * as svc from './marketplace.service';

// Webhooks do Asaas = mecanismo principal de pagamento, liquidacao do split e estorno.
// Sem polling. Eventos (docs.asaas.com, "Eventos para cobrancas"): PAYMENT_CONFIRMED, PAYMENT_RECEIVED,
// PAYMENT_REFUNDED, PAYMENT_PARTIALLY_REFUNDED, PAYMENT_DELETED, PAYMENT_OVERDUE,
// PAYMENT_SPLIT_DIVERGENCE_BLOCK, PAYMENT_SPLIT_DIVERGENCE_BLOCK_FINISHED.

export const marketplaceWebhookRoutes: Router = Router();

const tokenOk = (given: unknown): boolean => {
  const expected = env.MARKETPLACE_ASAAS_WEBHOOK_TOKEN;
  if (!expected || typeof given !== 'string') return false;
  const a = Buffer.from(given), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

interface AsaasEvent { id?: string; event?: string; payment?: { id?: string; netValue?: number; externalReference?: string } }

/** Processa um evento dentro da transacao do registro de idempotencia. */
export async function processAsaasEvent(evt: AsaasEvent): Promise<'processed' | 'duplicate' | 'ignored'> {
  if (!evt.id || !evt.event) return 'ignored';
  const paymentId = evt.payment?.id;
  try {
    await prisma.marketplaceWebhookEvent.create({ data: { id: evt.id, event: evt.event, paymentId, payload: evt as unknown as Prisma.InputJsonValue } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return 'duplicate';
    throw e;
  }

  try {
    const checkout = paymentId ? await prisma.marketplaceCheckout.findUnique({ where: { gatewayPaymentId: paymentId }, include: { orders: { select: { id: true } } } }) : null;
    if (!checkout) return 'ignored'; // cobranca de outro produto (ex.: assinatura): so registrada
    const netValueCents = evt.payment?.netValue ? Math.round(evt.payment.netValue * 100) : undefined;

    switch (evt.event) {
      case 'PAYMENT_CONFIRMED':
        await svc.confirmCheckoutPaid(checkout.id, { netValueCents });
        break;
      case 'PAYMENT_RECEIVED':
        await svc.confirmCheckoutPaid(checkout.id, { settled: true, netValueCents });
        break;
      case 'PAYMENT_REFUNDED':
        for (const o of checkout.orders) {
          try { await svc.refundOrder(o.id, 'asaas-webhook', 'estorno no gateway'); }
          catch (err) {
            // Cashback ja liberado: o dinheiro ja voltou no Asaas, mas a regra exige aprovacao humana. Registra e segue (sem retry infinito).
            await svc.audit(prisma, 'asaas-webhook', 'order.refund.needs-approval', 'order', o.id, undefined, { reason: (err as Error).message });
          }
        }
        break;
      case 'PAYMENT_DELETED':
      case 'PAYMENT_OVERDUE':
        await svc.cancelUnpaidCheckout(checkout.id, 'asaas-webhook', evt.event);
        break;
      case 'PAYMENT_PARTIALLY_REFUNDED':
      case 'PAYMENT_SPLIT_DIVERGENCE_BLOCK':
      case 'PAYMENT_SPLIT_DIVERGENCE_BLOCK_FINISHED':
        await svc.audit(prisma, 'asaas-webhook', `gateway.${evt.event.toLowerCase()}`, 'checkout', checkout.id, undefined, { paymentId });
        break;
      default:
        break;
    }
    return 'processed';
  } catch (err) {
    // Falhou: libera o id para o Asaas poder reenviar e reprocessar.
    await prisma.marketplaceWebhookEvent.delete({ where: { id: evt.id } }).catch(() => undefined);
    throw err;
  }
}

marketplaceWebhookRoutes.get('/asaas', (_req, res) => res.status(200).send('OK'));
marketplaceWebhookRoutes.head('/asaas', (_req, res) => res.sendStatus(200));
marketplaceWebhookRoutes.post('/asaas', async (req: Request, res: Response) => {
  if (!tokenOk(req.headers['asaas-access-token'])) return res.status(401).json({ success: false });
  try {
    const result = await processAsaasEvent(req.body as AsaasEvent);
    res.status(200).json({ success: true, result });
  } catch (err) {
    logger.error({ err }, 'marketplace webhook falhou');
    res.status(500).json({ success: false }); // Asaas reenvia
  }
});
