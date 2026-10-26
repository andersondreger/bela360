import { describe, it, expect } from 'vitest';
import {
  orderMoney, balanceOf, walletUsable, allocateDiscount, distributorSellable, validateSplit, DEFAULT_RULES,
} from './rules';

describe('regras do marketplace', () => {
  it('aceite 1: R$1.000, comissao 12%, cashback 50%, taxa 3%', () => {
    const m = orderMoney(100_000, 1200, DEFAULT_RULES);
    expect(m.commissionCents).toBe(12_000);
    expect(m.cashbackCents).toBe(6_000);
    expect(m.toDistributorCents).toBe(88_000);
    expect(m.feeCents).toBe(3_000);
    expect(m.netRevenueCents).toBe(3_000);
  });

  it('cashback e calculado sobre o valor pago depois do saldo usado', () => {
    const m = orderMoney(100_000 - 20_000, 1200, DEFAULT_RULES);
    expect(m.commissionCents).toBe(9_600);
    expect(m.cashbackCents).toBe(4_800);
  });

  it('aceite 3: distribuidor sem walletId ou nao ativo nao e vendavel', () => {
    expect(distributorSellable({ status: 'ATIVO', asaasWalletId: null })).toBe(false);
    expect(distributorSellable({ status: 'ATIVO', asaasWalletId: '  ' })).toBe(false);
    expect(distributorSellable({ status: 'PAUSADO', asaasWalletId: 'w1' })).toBe(false);
    expect(distributorSellable({ status: 'EM_NEGOCIACAO', asaasWalletId: 'w1' })).toBe(false);
    expect(distributorSellable({ status: 'ATIVO', asaasWalletId: 'w1' })).toBe(true);
  });

  it('aceite 5: saldo usado nunca passa do limite por pedido nem do saldo', () => {
    expect(walletUsable(100_000, 50_000, 30)).toBe(30_000);
    expect(walletUsable(100_000, 5_000, 30)).toBe(5_000);
    expect(walletUsable(100_000, -10, 30)).toBe(0);
    expect(walletUsable(999, 10_000, 30)).toBe(299);
  });

  it('aceite 4: estorno cancela o previsto e devolve o saldo usado (ledger append-only)', () => {
    // cashback liberado de 100,00, 30,00 usados num pedido que depois e estornado
    const after = balanceOf([
      { type: 'CASHBACK_PREVISTO', amountCents: 6_000 },
      { type: 'USO_DE_SALDO', amountCents: 3_000 },
      { type: 'CASHBACK_LIBERADO', amountCents: 10_000 },
      { type: 'CANCELAMENTO', amountCents: 6_000 },
      { type: 'ESTORNO', amountCents: 3_000 },
    ]);
    expect(after.availableCents).toBe(10_000);
    expect(after.usedCents).toBe(0);
  });

  it('saldo a liberar so conta o previsto ainda nao liberado nem cancelado', () => {
    const b = balanceOf([
      { type: 'CASHBACK_PREVISTO', amountCents: 6_000 },
      { type: 'CASHBACK_PREVISTO', amountCents: 2_000 },
      { type: 'CASHBACK_LIBERADO', amountCents: 6_000 },
    ]);
    expect(b.pendingCents).toBe(2_000);
    expect(b.availableCents).toBe(6_000);
  });

  it('o desconto repartido soma exatamente o total', () => {
    const parts = allocateDiscount([33_333, 33_333, 33_334], 1_001);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(1_001);
    expect(allocateDiscount([100, 200], 0)).toEqual([0, 0]);
  });

  it('split: soma nao pode passar do liquido', () => {
    expect(() => validateSplit([{ walletId: 'w', fixedCents: 88_000 }], 97_000)).not.toThrow();
    expect(() => validateSplit([{ walletId: 'w', fixedCents: 98_000 }], 97_000)).toThrow();
    expect(() => validateSplit([{ walletId: '', fixedCents: 10 }], 97_000)).toThrow();
  });

  it('rejeita valores nao inteiros', () => {
    expect(() => orderMoney(10.5, 1200, DEFAULT_RULES)).toThrow();
  });
});

describe('balanceOf com cashback revertido (estorno aprovado apos liberacao)', () => {
  it('debita do disponivel e pode ficar negativo se o saldo ja foi gasto', () => {
    const b = balanceOf([
      { type: 'CASHBACK_PREVISTO', amountCents: 6000 }, { type: 'CASHBACK_LIBERADO', amountCents: 6000 },
      { type: 'USO_DE_SALDO', amountCents: 5000 }, { type: 'CASHBACK_REVERTIDO', amountCents: 6000 },
    ]);
    expect(b.availableCents).toBe(-5000);
    expect(b.pendingCents).toBe(0);
    expect(walletUsable(100_000, b.availableCents, 30)).toBe(0);
  });
});
