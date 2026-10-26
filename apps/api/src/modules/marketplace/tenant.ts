import { Prisma } from '@prisma/client';
import { prisma } from '../../config';

/**
 * Leitura da area do cliente sob RLS do Postgres: dentro da transacao o papel vira `marketplace_tenant`
 * (so SELECT) e `app.business_id` fixa o tenant. Se uma consulta esquecer o filtro por businessId,
 * o banco ainda so devolve linhas do proprio tenant. Escritas NAO passam por aqui.
 */
export function tenantRead<T>(businessId: string, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  if (!businessId) throw new Error('tenantRead exige businessId');
  return prisma.$transaction(async tx => {
    await tx.$executeRawUnsafe('SET LOCAL ROLE marketplace_tenant');
    await tx.$queryRaw`SELECT set_config('app.business_id', ${businessId}, true)`;
    return fn(tx);
  });
}
