import { logger } from '../../config';
import { releaseDueCashback } from './marketplace.service';

export { marketplaceRoutes, marketplaceAdminRoutes } from './marketplace.routes';

/** Job diario de liberacao do cashback (idempotente: o ledger so aceita um CASHBACK_LIBERADO por pedido). */
export function initMarketplaceJobs(): void {
  const run = () => releaseDueCashback().then(r => r.released && logger.info(r, 'marketplace: cashback liberado')).catch(e => logger.error({ e }, 'marketplace: falha ao liberar cashback'));
  setTimeout(run, 60_000);
  setInterval(run, 6 * 60 * 60 * 1000).unref();
}
