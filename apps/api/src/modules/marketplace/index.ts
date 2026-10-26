import { logger } from '../../config';
import { expireStaleCheckouts, releaseDueCashback } from './marketplace.service';
import { dispatchPending } from './messages.service';

export { marketplaceRoutes, marketplaceAdminRoutes } from './marketplace.routes';
export { marketplaceWebhookRoutes } from './marketplace.webhook';

/** Job diario de liberacao do cashback (idempotente: o ledger so aceita um CASHBACK_LIBERADO por pedido). */
export function initMarketplaceJobs(): void {
  const run = () => releaseDueCashback().then(r => r.released && logger.info(r, 'marketplace: cashback liberado')).catch(e => logger.error({ e }, 'marketplace: falha ao liberar cashback'));
  const expire = () => expireStaleCheckouts().then(r => r.expired && logger.info(r, 'marketplace: checkouts pendentes expirados')).catch(e => logger.error({ e }, 'marketplace: falha ao expirar checkouts'));
  setTimeout(run, 60_000);
  setTimeout(expire, 90_000);
  setInterval(expire, 6 * 60 * 60 * 1000).unref();
  setInterval(run, 6 * 60 * 60 * 1000).unref();
  // Envio de mensagens: a cada minuto, no maximo 30 por rodada (limite de volume).
  const send = () => dispatchPending().then(r => (r.sent || r.failed) && logger.info(r, 'marketplace: mensagens processadas')).catch(e => logger.error({ e }, 'marketplace: falha ao enviar mensagens'));
  setInterval(send, 60_000).unref();
}
