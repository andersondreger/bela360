// Regras de negocio do Marketplace. Funcoes puras, sem banco: dinheiro SEMPRE em
// centavos (inteiro), percentuais em pontos-base (12% = 1200 bp) para nunca usar float.

export type LedgerType =
  | 'CASHBACK_PREVISTO'
  | 'CASHBACK_LIBERADO'
  | 'USO_DE_SALDO'
  | 'CANCELAMENTO'
  | 'ESTORNO';

export interface LedgerEntry {
  type: LedgerType;
  amountCents: number;
}

export interface MarketplaceRules {
  /** % da comissao que volta ao cliente (inteiro 0-100). Padrao 50. */
  cashbackSharePct: number;
  /** Limite do saldo usado por pedido, em % do valor (inteiro 0-100). Padrao 30. */
  walletLimitPct: number;
  /** Dias depois da entrega ate liberar o cashback. Padrao 7. */
  returnDays: number;
  /** Taxa estimada do meio de pagamento em pontos-base (3% = 300). */
  feeBp: number;
}

export const DEFAULT_RULES: MarketplaceRules = {
  cashbackSharePct: 50,
  walletLimitPct: 30,
  returnDays: 7,
  feeBp: 300,
};

export function assertCents(v: number, label = 'valor'): void {
  if (!Number.isSafeInteger(v)) throw new Error(`${label} deve ser inteiro em centavos`);
}

/** x * num / den arredondado ao inteiro mais proximo, sem float intermediario grande. */
function mulDiv(x: number, num: number, den: number): number {
  assertCents(x);
  return Math.round((x * num) / den);
}

export const commissionOf = (paidCents: number, commissionBp: number) => mulDiv(paidCents, commissionBp, 10000);
export const cashbackOf = (commissionCents: number, sharePct: number) => mulDiv(commissionCents, sharePct, 100);
export const feeOf = (paidCents: number, feeBp: number) => mulDiv(paidCents, feeBp, 10000);

export interface OrderMoney {
  paidCents: number;
  commissionCents: number;
  cashbackCents: number;
  /** Repasse ao distribuidor = pago - comissao. */
  toDistributorCents: number;
  feeCents: number;
  /** Comissao liquida = comissao - taxa. */
  netCommissionCents: number;
  /** Receita liquida = comissao liquida - cashback. */
  netRevenueCents: number;
}

/** O cashback e calculado sobre o valor efetivamente pago (depois de descontar o saldo usado). */
export function orderMoney(paidCents: number, commissionBp: number, rules: Pick<MarketplaceRules, 'cashbackSharePct' | 'feeBp'>): OrderMoney {
  const commissionCents = commissionOf(paidCents, commissionBp);
  const cashbackCents = cashbackOf(commissionCents, rules.cashbackSharePct);
  const feeCents = feeOf(paidCents, rules.feeBp);
  const netCommissionCents = commissionCents - feeCents;
  return {
    paidCents,
    commissionCents,
    cashbackCents,
    toDistributorCents: paidCents - commissionCents,
    feeCents,
    netCommissionCents,
    netRevenueCents: netCommissionCents - cashbackCents,
  };
}

export interface Balance {
  availableCents: number; // liberado - usado + estornado
  pendingCents: number; // previsto - liberado - cancelado (a liberar)
  usedCents: number; // uso liquido de estornos
  releasedCents: number; // total ja liberado
}

/** Saldo derivado do ledger append-only. Nunca ha coluna de saldo para editar. */
export function balanceOf(entries: LedgerEntry[]): Balance {
  let previsto = 0, liberado = 0, uso = 0, cancel = 0, estorno = 0;
  for (const e of entries) {
    assertCents(e.amountCents);
    if (e.type === 'CASHBACK_PREVISTO') previsto += e.amountCents;
    else if (e.type === 'CASHBACK_LIBERADO') liberado += e.amountCents;
    else if (e.type === 'USO_DE_SALDO') uso += e.amountCents;
    else if (e.type === 'CANCELAMENTO') cancel += e.amountCents;
    else if (e.type === 'ESTORNO') estorno += e.amountCents;
  }
  return {
    availableCents: liberado - uso + estorno,
    pendingCents: previsto - liberado - cancel,
    usedCents: uso - estorno,
    releasedCents: liberado,
  };
}

/** Quanto de saldo pode ser usado: min(saldo disponivel, limite % do pedido). Nunca negativo. */
export function walletUsable(grossCents: number, availableCents: number, limitPct: number): number {
  const cap = Math.floor((grossCents * limitPct) / 100);
  return Math.max(0, Math.min(availableCents, cap));
}

/**
 * Reparte o desconto de saldo entre os pedidos (um por distribuidor) proporcionalmente ao
 * subtotal, pelo maior resto, para que a soma seja exatamente o desconto total.
 */
export function allocateDiscount(subtotals: number[], discountCents: number): number[] {
  const total = subtotals.reduce((a, b) => a + b, 0);
  if (total <= 0 || discountCents <= 0) return subtotals.map(() => 0);
  const base = subtotals.map(s => Math.floor((s * discountCents) / total));
  let rest = discountCents - base.reduce((a, b) => a + b, 0);
  const order = subtotals
    .map((s, i) => ({ i, frac: (s * discountCents) % total }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; rest > 0; k = (k + 1) % order.length, rest--) base[order[k].i]++;
  return base;
}

export function releaseDate(deliveredAt: Date, returnDays: number): Date {
  return new Date(deliveredAt.getTime() + returnDays * 86_400_000);
}

export type DistributorStatus = 'ATIVO' | 'EM_NEGOCIACAO' | 'PAUSADO';

/** Produto so aparece (e so pode ser comprado) se o distribuidor esta ativo E tem walletId. */
export function distributorSellable(d: { status: DistributorStatus; asaasWalletId: string | null }): boolean {
  return d.status === 'ATIVO' && !!d.asaasWalletId?.trim();
}

/**
 * Validacao do split antes de criar a cobranca no Asaas: soma dos fixedValue nao pode
 * passar do liquido. Valores em centavos; o Asaas recebe reais com no maximo 2 casas.
 */
export function validateSplit(splits: { walletId: string; fixedCents: number }[], netCents: number): void {
  const total = splits.reduce((a, s) => a + s.fixedCents, 0);
  if (total > netCents) throw new Error('Split maior que o valor liquido da cobranca');
  for (const s of splits) if (!s.walletId || s.fixedCents <= 0) throw new Error('Split invalido');
}

export const centsToReais = (cents: number): number => Number((cents / 100).toFixed(2));
