import { logger } from '../../config';
import { releaseDueCashback } from './marketplace.service';
import { dispatchPending } from './messages.service';

export { marketplaceRoutes, marketplaceAdminRoutes } from './marketplace.routes';
export { marketplaceWebhookRoutes } from './marketplace.webhook';

/** Job diario de liberacao do cashback (idempotente: o ledger so aceita um CASHBACK_LIBERADO por pedido). */
export function initMarketplaceJobs(): void {
  const run = () => releaseDueCashback().then(r => r.released && logger.info(r, 'marketplace: cashback liberado')).catch(e => logger.error({ e }, 'marketplace: falha ao liberar cashback'));
  setTimeout(run, 60_000);
  setInterval(run, 6 * 60 * 60 * 1000).unref();
  // Envio de mensagens: a cada minuto, no maximo 30 por rodada (limite de volume).
  const send = () => dispatchPending().then(r => (r.sent || r.failed) && logger.info(r, 'marketplace: mensagens processadas')).catch(e => logger.error({ e }, 'marketplace: falha ao enviar mensagens'));
  setInterval(send, 60_000).unref();
}
