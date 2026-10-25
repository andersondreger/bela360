import { api } from './api';

export const brl = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const fdate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '');

export type Category = 'CABELO' | 'ESTETICA_FACIAL' | 'CORPORAL' | 'DESCARTAVEIS' | 'EQUIPAMENTOS';
export const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'CABELO', label: 'Cabelo' },
  { key: 'ESTETICA_FACIAL', label: 'Estética facial' },
  { key: 'CORPORAL', label: 'Corporal' },
  { key: 'DESCARTAVEIS', label: 'Descartáveis' },
  { key: 'EQUIPAMENTOS', label: 'Equipamentos' },
];

export type OrderStatus = 'RECEBIDO' | 'PAGO' | 'ENVIADO' | 'ENTREGUE' | 'CASHBACK_LIBERADO' | 'ESTORNADO';
export const STEPS: { key: OrderStatus; label: string }[] = [
  { key: 'RECEBIDO', label: 'Recebido' },
  { key: 'PAGO', label: 'Pago' },
  { key: 'ENVIADO', label: 'Enviado' },
  { key: 'ENTREGUE', label: 'Entregue' },
  { key: 'CASHBACK_LIBERADO', label: 'Cashback liberado' },
];

export interface Balance { availableCents: number; pendingCents: number; usedCents: number; releasedCents: number }
export interface CatalogItem { id: string; name: string; category: Category; priceCents: number; cashbackCents: number; distributor: { id: string; name: string } }
export interface OrderItem { name: string; qty: number; priceCents: number }
export interface Order {
  id: string; number: number; status: OrderStatus; splitStatus: string; createdAt: string; releaseAt: string | null;
  paidCents: number; walletUsedCents: number; commissionBp: number; commissionCents: number; cashbackCents: number;
  items: OrderItem[]; distributor: { id: string; name: string }; checkout?: { invoiceUrl: string | null; status: string };
}
export interface LedgerRow { id: string; type: string; amountCents: number; note: string; createdAt: string; order?: { number: number } | null }
export interface Quote {
  grossCents: number; walletCents: number; paidCents: number; cashbackCents: number; availableCents: number; maxWalletCents: number; walletLimitPct: number;
  orders: { distributor: string; subtotalCents: number; walletUsedCents: number; paidCents: number; cashbackCents: number }[];
}
export interface Overview {
  wallet: Balance; rules: { cashbackSharePct: number; walletLimitPct: number; returnDays: number };
  inProgress: number; purchasedCents: number; commissionSplit: { toClientCents: number; toBelaCents: number }; recent: Order[];
}
export interface ClientFinance {
  totals: { purchasedCents: number; walletUsedCents: number; cashbackEarnedCents: number; refundedCents: number };
  wallet: Balance;
  byDistributor: { id: string; name: string; orders: number; paidCents: number; cashbackCents: number }[];
  orders: { id: string; number: number; createdAt: string; status: OrderStatus; splitStatus: string; distributor: string; paidCents: number; walletUsedCents: number; cashbackCents: number; releaseAt: string | null }[];
}
export type CartLine = { productId: string; qty: number };

export const marketplaceApi = {
  overview: () => api.get<Overview>('/marketplace/overview'),
  catalog: (p: { category?: Category; q?: string }) => {
    const qs = new URLSearchParams(Object.entries(p).filter(([, v]) => v) as [string, string][]).toString();
    return api.get<CatalogItem[]>(`/marketplace/catalog${qs ? `?${qs}` : ''}`);
  },
  quote: (items: CartLine[], useWallet: boolean) => api.post<Quote>('/marketplace/cart/quote', { items, useWallet }),
  checkout: (items: CartLine[], useWallet: boolean) =>
    api.post<{ checkoutId: string; paidCents: number; gateway: string; invoiceUrl: string | null; orders: { id: string; number: number }[] }>('/marketplace/checkout', { items, useWallet }),
  simulatePay: (checkoutId: string) => api.post<{ changed: boolean }>(`/marketplace/checkout/${checkoutId}/simulate-pay`),
  orders: (filter: 'todos' | 'andamento' | 'concluidos') => api.get<Order[]>(`/marketplace/orders?filter=${filter}`),
  cashback: () => api.get<{ wallet: Balance; ledger: LedgerRow[] }>('/marketplace/cashback'),
  finance: () => api.get<ClientFinance>('/marketplace/finance'),
};
