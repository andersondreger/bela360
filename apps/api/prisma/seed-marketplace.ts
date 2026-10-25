// Dados de EXEMPLO do marketplace (distribuidores e produtos ficticios, carteiras "demo-*").
// Nao roda sozinho: so em ambiente de teste/sandbox ->  npx tsx prisma/seed-marketplace.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DIST = [
  { name: 'Aurora Cosmeticos Profissionais', commissionBp: 1200, payDays: 30, status: 'ATIVO' as const, asaasWalletId: 'demo-aurora' },
  { name: 'DermaLine Estetica', commissionBp: 1500, payDays: 30, status: 'ATIVO' as const, asaasWalletId: 'demo-dermaline' },
  { name: 'Clean & Care Descartaveis', commissionBp: 1000, payDays: 15, status: 'ATIVO' as const, asaasWalletId: 'demo-cleancare' },
  { name: 'Equipa Estetica Brasil', commissionBp: 800, payDays: 45, status: 'ATIVO' as const, asaasWalletId: 'demo-equipa' },
  { name: 'Studio Pro Distribuicao', commissionBp: 1400, payDays: 30, status: 'EM_NEGOCIACAO' as const, asaasWalletId: null },
];
const PRODS: [number, string, 'CABELO' | 'ESTETICA_FACIAL' | 'CORPORAL' | 'DESCARTAVEIS' | 'EQUIPAMENTOS', number][] = [
  [0, 'Mascara de reconstrucao capilar 1 kg', 'CABELO', 18990], [0, 'Shampoo profissional antirresiduo 1 L', 'CABELO', 9450],
  [1, 'Serum de vitamina C 30 ml', 'ESTETICA_FACIAL', 14800], [1, 'Peeling de acido mandelico 50 ml', 'ESTETICA_FACIAL', 22900],
  [1, 'Oleo de massagem drenante 500 ml', 'CORPORAL', 7490], [2, 'Luvas nitrilicas caixa com 100', 'DESCARTAVEIS', 3990],
  [2, 'Toucas descartaveis pacote com 100', 'DESCARTAVEIS', 1850], [3, 'Vaporizador facial com ozonio', 'EQUIPAMENTOS', 129000],
];

async function main() {
  const ds = [];
  for (const d of DIST) ds.push(await prisma.distributor.create({ data: d }));
  for (const [i, name, category, priceCents] of PRODS) await prisma.marketplaceProduct.create({ data: { distributorId: ds[i].id, name, category, priceCents } });
  console.log(`seed: ${ds.length} distribuidores, ${PRODS.length} produtos`);
}
main().finally(() => prisma.$disconnect());
