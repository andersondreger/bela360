'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShoppingCart, Plus, Minus, X, Wallet, Package, Search } from 'lucide-react';
import { Button, Card, CardContent, Badge, PageHeader } from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  marketplaceApi, brl, fdate, CATEGORIES, STEPS,
  type CatalogItem, type CartLine, type Category, type ClientFinance, type LedgerRow, type Balance, type Order, type Overview, type Quote,
} from '@/lib/marketplace';

const TABS = [
  { key: 'geral', label: 'Visão geral' },
  { key: 'catalogo', label: 'Marketplace' },
  { key: 'pedidos', label: 'Pedidos' },
  { key: 'cashback', label: 'Cashback' },
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'mensagens', label: 'Mensagens' },
] as const;
type Tab = (typeof TABS)[number]['key'];

const CART_KEY = 'bela360_mk_cart';
const useAsync = <T,>(fn: () => Promise<T>, deps: unknown[]) => {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const run = useCallback(() => {
    setLoading(true);
    fn().then(d => { setData(d); setError(''); }).catch(e => setError((e as Error).message)).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(run, [run]);
  return { data, error, loading, reload: run };
};

function Kpi({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'warn' }) {
  return (
    <Card><CardContent className="p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn('mt-1 text-2xl font-bold tabular-nums', tone === 'good' && 'text-emerald-600', tone === 'warn' && 'text-amber-600')}>{value}</p>
    </CardContent></Card>
  );
}
const Empty = ({ children }: { children: React.ReactNode }) => <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">{children}</CardContent></Card>;
const Err = ({ msg }: { msg: string }) => (msg ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">{msg}</p> : null);

function StatusBadge({ status }: { status: Order['status'] }) {
  if (status === 'ESTORNADO') return <Badge variant="destructive">Estornado</Badge>;
  const label = STEPS.find(s => s.key === status)?.label ?? status;
  return <Badge variant={status === 'CASHBACK_LIBERADO' ? 'success' : 'warning'}>{label}</Badge>;
}

// ---------------------------------------------------------------- Visão geral
function Geral({ go }: { go: (t: Tab) => void }) {
  const { data: o, error, loading } = useAsync<Overview>(marketplaceApi.overview, []);
  if (loading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!o) return <Err msg={error} />;
  const total = o.commissionSplit.toClientCents + o.commissionSplit.toBelaCents;
  const pct = total ? Math.round((o.commissionSplit.toClientCents / total) * 100) : o.rules.cashbackSharePct;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-[5fr_6fr]">
        <div className="flex flex-col gap-3 rounded-2xl bg-primary p-6 text-primary-foreground">
          <p className="text-sm opacity-90">Saldo de cashback disponível</p>
          <p className="text-5xl font-bold tabular-nums">{brl(o.wallet.availableCents)}</p>
          <div className="flex gap-8 text-sm">
            <div><b className="block text-lg tabular-nums">{brl(o.wallet.pendingCents)}</b>a liberar</div>
            <div><b className="block text-lg tabular-nums">{brl(o.wallet.usedCents)}</b>já usado</div>
          </div>
          <Button variant="secondary" className="self-start" onClick={() => go('catalogo')}>Usar no marketplace</Button>
        </div>
        <Card><CardContent className="space-y-3 p-6">
          <h2 className="font-semibold">Para onde vai a comissão</h2>
          <p className="text-sm text-muted-foreground">Em cada compra, {o.rules.cashbackSharePct}% da comissão do distribuidor volta para você.</p>
          <div className="flex h-7 overflow-hidden rounded-lg bg-muted" role="img" aria-label={`${pct}% da comissão volta para você`}>
            <i className="block bg-emerald-500" style={{ width: `${pct}%` }} /><i className="block bg-primary" style={{ width: `${100 - pct}%` }} />
          </div>
          <div className="flex flex-wrap gap-6 text-sm">
            <div><b className="block text-lg tabular-nums">{brl(o.commissionSplit.toClientCents)}</b><span className="text-muted-foreground">volta para você</span></div>
            <div><b className="block text-lg tabular-nums">{brl(o.commissionSplit.toBelaCents)}</b><span className="text-muted-foreground">fica com a Bela 360</span></div>
          </div>
        </CardContent></Card>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Pedidos em andamento" value={String(o.inProgress)} />
        <Kpi label="Total comprado" value={brl(o.purchasedCents)} />
        <Kpi label="Cashback já liberado" value={brl(o.wallet.releasedCents)} tone="good" />
      </div>
      <div className="flex items-center justify-between"><h2 className="font-semibold">Pedidos recentes</h2><Button variant="ghost" size="sm" onClick={() => go('pedidos')}>Ver todos</Button></div>
      {o.recent.length ? o.recent.map(r => (
        <Card key={r.id}><CardContent className="flex items-center justify-between gap-3 p-4">
          <div><b>Pedido #{r.number}</b><p className="text-sm text-muted-foreground">{r.distributor.name}, {fdate(r.createdAt)}</p></div>
          <div className="text-right"><p className="font-semibold tabular-nums">{brl(r.paidCents)}</p><StatusBadge status={r.status} /></div>
        </CardContent></Card>
      )) : <Empty>Você ainda não fez pedidos.</Empty>}
    </div>
  );
}

// ---------------------------------------------------------------- Catálogo + carrinho
function Catalogo({ cart, setCart }: { cart: CartLine[]; setCart: (c: CartLine[]) => void }) {
  const [cat, setCat] = useState<Category | ''>('');
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => { const t = setTimeout(() => setDebounced(q), 250); return () => clearTimeout(t); }, [q]);
  const { data, error, loading } = useAsync(() => marketplaceApi.catalog({ category: cat || undefined, q: debounced || undefined }), [cat, debounced]);
  const qty = (id: string) => cart.find(c => c.productId === id)?.qty ?? 0;
  const set = (id: string, n: number) => setCart(n <= 0 ? cart.filter(c => c.productId !== id) : cart.some(c => c.productId === id) ? cart.map(c => (c.productId === id ? { ...c, qty: Math.min(n, 999) } : c)) : [...cart, { productId: id, qty: n }]);
  return (
    <div className="space-y-4">
      <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar produto" aria-label="Buscar produto" className="h-11 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm" /></div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[{ key: '' as const, label: 'Todos' }, ...CATEGORIES].map(c => (
          <button key={c.key} onClick={() => setCat(c.key)} className={cn('whitespace-nowrap rounded-full border px-4 py-2 text-sm', cat === c.key ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card')}>{c.label}</button>
        ))}
      </div>
      <Err msg={error} />
      {loading ? <p className="text-sm text-muted-foreground">Carregando…</p> : !data?.length ? (
        <Empty>Nenhum produto disponível. Os produtos aparecem quando o distribuidor está ativo e com carteira Asaas ligada.</Empty>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-4">
          {data.map((p: CatalogItem) => (
            <Card key={p.id} className="flex flex-col overflow-hidden">
              <div className="grid h-20 place-items-center bg-primary/10 text-4xl font-bold text-primary" aria-hidden>{p.name.charAt(0)}</div>
              <CardContent className="flex flex-1 flex-col gap-2 p-4">
                <h3 className="font-semibold leading-tight">{p.name}</h3>
                <p className="text-xs text-muted-foreground">{p.distributor.name}</p>
                <p className="text-xl font-bold tabular-nums">{brl(p.priceCents)}</p>
                <div><Badge variant="success">Cashback {brl(p.cashbackCents)}</Badge></div>
                <div className="mt-auto pt-2">
                  {qty(p.id) > 0 ? (
                    <div className="flex items-center justify-between rounded-xl border border-border">
                      <button className="h-10 w-10" aria-label="Diminuir" onClick={() => set(p.id, qty(p.id) - 1)}><Minus className="mx-auto h-4 w-4" /></button>
                      <b className="tabular-nums">{qty(p.id)}</b>
                      <button className="h-10 w-10" aria-label="Aumentar" onClick={() => set(p.id, qty(p.id) + 1)}><Plus className="mx-auto h-4 w-4" /></button>
                    </div>
                  ) : <Button className="w-full" onClick={() => set(p.id, 1)}>Adicionar</Button>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CartDrawer({ cart, setCart, open, onClose, onDone }: { cart: CartLine[]; setCart: (c: CartLine[]) => void; open: boolean; onClose: () => void; onDone: () => void }) {
  const [useWallet, setUseWallet] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const key = JSON.stringify(cart);
  useEffect(() => {
    if (!open || !cart.length) { setQuote(null); return; }
    marketplaceApi.quote(cart, useWallet).then(q => { setQuote(q); setErr(''); }).catch(e => setErr((e as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key, useWallet]);
  useEffect(() => {
    if (!open || !cart.length) return;
    marketplaceApi.catalog({}).then(list => setNames(Object.fromEntries(list.map(p => [p.id, `${p.name}|${p.priceCents}`])))).catch(() => undefined);
  }, [open, cart.length]);

  const pay = async () => {
    setBusy(true); setErr('');
    try {
      const c = await marketplaceApi.checkout(cart, useWallet);
      // Simulado confirma na hora; com Asaas abre a cobranca (Pix, boleto ou cartao) e o webhook confirma depois.
      if (c.gateway === 'simulado') await marketplaceApi.simulatePay(c.checkoutId);
      else if (c.invoiceUrl) window.open(c.invoiceUrl, '_blank', 'noopener');
      setCart([]); onDone(); onClose();
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };

  return (
    <>
      <div className={cn('fixed inset-0 z-40 bg-black/50 transition-opacity', open ? 'opacity-100' : 'pointer-events-none opacity-0')} onClick={onClose} />
      <aside aria-label="Carrinho" className={cn('fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border bg-card p-4 shadow-xl transition-transform', open ? 'translate-x-0' : 'translate-x-full')}>
        <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold">Carrinho</h2><button onClick={onClose} aria-label="Fechar"><X className="h-5 w-5" /></button></div>
        {!cart.length ? <p className="py-10 text-center text-sm text-muted-foreground">Seu carrinho está vazio.</p> : (
          <>
            <div className="flex-1 space-y-3 overflow-auto">
              {cart.map(l => { const [n, p] = (names[l.productId] ?? '|0').split('|'); return (
                <div key={l.productId} className="flex items-center justify-between gap-3 border-b border-border pb-3">
                  <div className="min-w-0"><b className="block truncate text-sm">{n || 'Produto'}</b><span className="text-xs text-muted-foreground">{l.qty} × {brl(Number(p))}</span></div>
                  <div className="flex items-center gap-2">
                    <button aria-label="Diminuir" onClick={() => setCart(l.qty <= 1 ? cart.filter(c => c.productId !== l.productId) : cart.map(c => (c.productId === l.productId ? { ...c, qty: c.qty - 1 } : c)))}><Minus className="h-4 w-4" /></button>
                    <b className="w-6 text-center tabular-nums">{l.qty}</b>
                    <button aria-label="Aumentar" onClick={() => setCart(cart.map(c => (c.productId === l.productId ? { ...c, qty: c.qty + 1 } : c)))}><Plus className="h-4 w-4" /></button>
                  </div>
                </div>); })}
            </div>
            {quote && (
              <div className="mt-3 space-y-2 border-t border-border pt-3 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span className="tabular-nums">{brl(quote.grossCents)}</span></div>
                <label className="flex items-start gap-2 rounded-xl border border-border p-3">
                  <input type="checkbox" className="mt-1" checked={useWallet} disabled={quote.availableCents <= 0} onChange={e => setUseWallet(e.target.checked)} />
                  <span>Usar saldo de cashback<br /><span className="text-xs text-muted-foreground">Disponível: {brl(quote.availableCents)}. Limite de {quote.walletLimitPct}% do pedido.</span></span>
                </label>
                {quote.walletCents > 0 && <div className="flex justify-between text-emerald-600"><span>Desconto do saldo</span><span className="tabular-nums">− {brl(quote.walletCents)}</span></div>}
                <div className="flex justify-between text-xl font-bold"><span>Total a pagar</span><span className="tabular-nums">{brl(quote.paidCents)}</span></div>
                <div className="flex justify-between"><span>Cashback estimado</span><span className="tabular-nums text-emerald-600">+ {brl(quote.cashbackCents)}</span></div>
                <p className="text-xs text-muted-foreground">Cada distribuidor entrega separado: o carrinho gera um pedido por distribuidor ({quote.orders.length}), todos no mesmo pagamento.</p>
                <Err msg={err} />
                <Button className="w-full" disabled={busy} onClick={pay}>{busy ? 'Finalizando…' : 'Finalizar pedido'}</Button>
              </div>
            )}
            {!quote && <Err msg={err} />}
          </>
        )}
      </aside>
    </>
  );
}

// ---------------------------------------------------------------- Pedidos
function Timeline({ status }: { status: Order['status'] }) {
  const idx = STEPS.findIndex(s => s.key === status);
  return (
    <ol className="grid grid-cols-5 text-center text-[11px] text-muted-foreground" aria-label="Etapas do pedido">
      {STEPS.map((s, i) => (
        <li key={s.key} className={cn('relative', i <= idx && 'text-foreground')}>
          {i > 0 && <span className={cn('absolute right-1/2 top-[6px] h-0.5 w-full', i <= idx ? 'bg-emerald-500' : 'bg-border')} />}
          <span className={cn('relative z-10 mx-auto mb-1 block h-3.5 w-3.5 rounded-full border-2', i <= idx ? 'border-emerald-500 bg-emerald-500' : 'border-border bg-card')} />
          {s.label}
        </li>
      ))}
    </ol>
  );
}
function Pedidos() {
  const [f, setF] = useState<'todos' | 'andamento' | 'concluidos'>('todos');
  const { data, error, loading } = useAsync(() => marketplaceApi.orders(f), [f]);
  return (
    <div className="space-y-4">
      <div className="flex gap-2">{([['todos', 'Todos'], ['andamento', 'Em andamento'], ['concluidos', 'Concluídos']] as const).map(([k, l]) => (
        <button key={k} onClick={() => setF(k)} className={cn('rounded-full border px-4 py-2 text-sm', f === k ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card')}>{l}</button>))}</div>
      <Err msg={error} />
      {loading ? <p className="text-sm text-muted-foreground">Carregando…</p> : !data?.length ? <Empty>Nenhum pedido nesta lista.</Empty> : data.map(o => (
        <Card key={o.id}><CardContent className="space-y-3 p-5">
          <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">Pedido #{o.number}</h3><p className="text-sm text-muted-foreground">{o.distributor.name}, {fdate(o.createdAt)}</p></div><StatusBadge status={o.status} /></div>
          <p className="text-sm text-muted-foreground">{o.items.map(i => `${i.qty}× ${i.name}`).join(', ')}</p>
          <dl className="grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-xl bg-muted p-3"><dt className="text-xs text-muted-foreground">Valor pago</dt><dd className="font-semibold tabular-nums">{brl(o.paidCents)}</dd></div>
            <div className="rounded-xl bg-muted p-3"><dt className="text-xs text-muted-foreground">Comissão ({o.commissionBp / 100}%)</dt><dd className="font-semibold tabular-nums">{brl(o.commissionCents)}</dd></div>
            <div className="rounded-xl bg-muted p-3"><dt className="text-xs text-muted-foreground">Seu cashback</dt><dd className="font-semibold tabular-nums text-emerald-600">{brl(o.cashbackCents)}</dd></div>
          </dl>
          {o.status === 'ESTORNADO' ? <p className="text-sm font-semibold text-red-600">Pedido estornado. O split foi desfeito e o cashback foi cancelado.</p> : <Timeline status={o.status} />}
          {o.status === 'RECEBIDO' && o.checkout?.invoiceUrl && (
            <a href={o.checkout.invoiceUrl} target="_blank" rel="noopener noreferrer" className="inline-block rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Pagar agora</a>
          )}
          {o.status === 'ENTREGUE' && o.releaseAt && <p className="text-xs text-muted-foreground">Cashback liberado em {fdate(o.releaseAt)}, ao fim do prazo de devolução.</p>}
        </CardContent></Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- Cashback
const LEDGER_LABEL: Record<string, string> = { CASHBACK_PREVISTO: 'A liberar', CASHBACK_LIBERADO: 'Liberado', USO_DE_SALDO: 'Usado', CANCELAMENTO: 'Cancelado', ESTORNO: 'Saldo devolvido' };
function Cashback() {
  const { data, error, loading } = useAsync(marketplaceApi.cashback, []);
  if (loading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!data) return <Err msg={error} />;
  const w: Balance = data.wallet;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3"><Kpi label="Disponível" value={brl(w.availableCents)} tone="good" /><Kpi label="A liberar" value={brl(w.pendingCents)} tone="warn" /><Kpi label="Já usado" value={brl(w.usedCents)} /></div>
      <h2 className="font-semibold">Extrato</h2>
      {data.ledger.length ? data.ledger.map((l: LedgerRow) => {
        const neg = l.type === 'USO_DE_SALDO' || l.type === 'CANCELAMENTO';
        return (
          <Card key={l.id}><CardContent className="flex items-center justify-between gap-3 p-4">
            <div><b className="text-sm">{l.note}</b><p className="text-xs text-muted-foreground">{fdate(l.createdAt)}</p></div>
            <div className="text-right"><p className={cn('font-semibold tabular-nums', neg ? 'text-red-600' : l.type === 'CASHBACK_PREVISTO' ? 'text-amber-600' : 'text-emerald-600')}>{neg ? '− ' : '+ '}{brl(l.amountCents)}</p><p className="text-xs text-muted-foreground">{LEDGER_LABEL[l.type]}</p></div>
          </CardContent></Card>);
      }) : <Empty>Seu extrato aparece aqui depois do primeiro pedido.</Empty>}
    </div>
  );
}

// ---------------------------------------------------------------- Financeiro do cliente
function Financeiro() {
  const { data, error, loading } = useAsync<ClientFinance>(marketplaceApi.finance, []);
  if (loading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!data) return <Err msg={error} />;
  const t = data.totals;
  const split = (s: string) => s === 'LIQUIDADO' ? <Badge variant="success">Split liquidado</Badge> : s === 'ESTORNADO' ? <Badge variant="destructive">Estornado</Badge> : <Badge variant="warning">Aguardando</Badge>;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total comprado" value={brl(t.purchasedCents)} /><Kpi label="Cashback ganho" value={brl(t.cashbackEarnedCents)} tone="good" />
        <Kpi label="Saldo usado em compras" value={brl(t.walletUsedCents)} /><Kpi label="Estornado" value={brl(t.refundedCents)} />
      </div>
      <Card><CardContent className="p-5 text-sm text-muted-foreground">Você tem <b className="text-foreground">{brl(data.wallet.availableCents)}</b> disponíveis e <b className="text-foreground">{brl(data.wallet.pendingCents)}</b> a liberar. Esta área mostra só as compras da sua clínica.</CardContent></Card>
      <h2 className="font-semibold">Por distribuidor</h2>
      {data.byDistributor.length ? data.byDistributor.map(d => (
        <Card key={d.id}><CardContent className="flex items-center justify-between p-4"><div><b>{d.name}</b><p className="text-sm text-muted-foreground">{d.orders} pedido(s)</p></div><div className="text-right"><p className="font-semibold tabular-nums">{brl(d.paidCents)}</p><p className="text-xs text-emerald-600">cashback {brl(d.cashbackCents)}</p></div></CardContent></Card>
      )) : <Empty>Os valores aparecem aqui depois do primeiro pedido.</Empty>}
      <h2 className="font-semibold">Por pedido</h2>
      {data.orders.map(o => (
        <Card key={o.id}><CardContent className="flex items-center justify-between gap-3 p-4">
          <div><b>Pedido #{o.number}</b><p className="text-sm text-muted-foreground">{o.distributor}, {fdate(o.createdAt)}</p></div>
          <div className="text-right"><p className="font-semibold tabular-nums">{brl(o.paidCents)}</p>{split(o.splitStatus)}</div>
        </CardContent></Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- Mensagens
const MSG_TYPE: Record<string, string> = { PEDIDO_PAGO: 'Pagamento confirmado', PEDIDO_ENVIADO: 'Pedido enviado', PEDIDO_ENTREGUE: 'Pedido entregue', CASHBACK_LIBERADO: 'Cashback liberado', PEDIDO_ESTORNADO: 'Pedido estornado' };
const MSG_STATUS: Record<string, string> = { PENDENTE: 'Na fila', ENVIADO: 'Enviada', SIMULADO: 'Registrada (teste)', FALHOU: 'Falhou', IGNORADO: 'Não enviada' };

function Mensagens() {
  const { data, error, loading, reload } = useAsync(() => marketplaceApi.messages(), []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = async (p: { whatsappOptIn?: boolean; emailOptIn?: boolean }) => {
    setBusy(true); setErr('');
    try { await marketplaceApi.setPreferences(p); reload(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  if (loading && !data) return <p className="text-muted-foreground">Carregando…</p>;
  if (!data) return <p role="alert" className="text-red-600">{error}</p>;
  const { pref } = data;
  return (
    <div className="space-y-4">
      <Card><CardContent className="space-y-4 p-5">
        <div>
          <h3 className="text-lg font-semibold">Avisos sobre os seus pedidos</h3>
          <p className="text-sm text-muted-foreground">Você recebe avisos de pagamento, envio, entrega, cashback liberado e estorno. Só falamos do seu pedido, nunca de promoções.{data.mode !== 'ativo' && ' (Envio ainda em fase de teste: os avisos ficam só registrados abaixo.)'}</p>
        </div>
        <label className="flex items-start gap-3 rounded-xl bg-muted p-3">
          <input type="checkbox" className="mt-1 h-4 w-4" checked={pref.whatsappOptIn} disabled={busy} onChange={e => set({ whatsappOptIn: e.target.checked })} />
          <span className="text-sm"><b>Receber por WhatsApp</b><br />Autorizo a Bela 360 a me enviar mensagens de WhatsApp sobre os meus pedidos do marketplace, no número cadastrado da conta. Posso desligar quando quiser.{pref.whatsappOptIn && pref.whatsappOptInAt && <span className="block text-xs text-muted-foreground">Autorizado em {new Date(pref.whatsappOptInAt).toLocaleDateString('pt-BR')}</span>}</span>
        </label>
        <label className="flex items-start gap-3 rounded-xl bg-muted p-3">
          <input type="checkbox" className="mt-1 h-4 w-4" checked={pref.emailOptIn} disabled={busy} onChange={e => set({ emailOptIn: e.target.checked })} />
          <span className="text-sm"><b>Receber por e-mail</b><br />No e-mail cadastrado da conta.</span>
        </label>
        {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
      </CardContent></Card>
      <h3 className="font-semibold">Histórico</h3>
      {data.messages.filter(m => m.status !== 'IGNORADO').length === 0 && <p className="text-muted-foreground">Nenhum aviso ainda.</p>}
      {data.messages.filter(m => m.status !== 'IGNORADO').map(m => (
        <Card key={m.id}><CardContent className="flex items-start justify-between gap-3 p-4">
          <div className="min-w-0"><b>{MSG_TYPE[m.type] ?? m.type}</b><p className="truncate text-sm text-muted-foreground">{m.body}</p></div>
          <div className="shrink-0 text-right text-xs text-muted-foreground"><p>{m.channel === 'WHATSAPP' ? 'WhatsApp' : 'E-mail'}</p><p>{MSG_STATUS[m.status]} · {fdate(m.createdAt)}</p></div>
        </CardContent></Card>))}
    </div>
  );
}

// ---------------------------------------------------------------- Página
function MarketplaceInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const tab = (TABS.find(t => t.key === sp.get('tab'))?.key ?? 'geral') as Tab;
  const go = (t: Tab) => router.replace(`/marketplace?tab=${t}`);
  const [cart, setCartState] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState(0);
  const [toast, setToast] = useState('');
  useEffect(() => { try { setCartState(JSON.parse(localStorage.getItem(CART_KEY) || '[]')); } catch { /* sem storage */ } }, []);
  const setCart = (c: CartLine[]) => { setCartState(c); try { localStorage.setItem(CART_KEY, JSON.stringify(c)); } catch { /* sem storage */ } };
  const count = useMemo(() => cart.reduce((a, c) => a + c.qty, 0), [cart]);

  return (
    <div>
      <PageHeader title="Marketplace" description="Compre dos distribuidores parceiros e receba parte da comissão de volta como cashback."
        actions={<Button variant="outline" onClick={() => setOpen(true)} aria-label="Abrir carrinho"><ShoppingCart className="mr-2 h-4 w-4" />Carrinho{count ? ` (${count})` : ''}</Button>} />
      <nav className="mb-5 flex gap-2 overflow-x-auto" aria-label="Seções do marketplace">
        {TABS.map(t => (
          <button key={t.key} onClick={() => go(t.key)} aria-current={tab === t.key ? 'page' : undefined}
            className={cn('whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium', tab === t.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground')}>
            {t.key === 'cashback' && <Wallet className="mr-1.5 inline h-4 w-4" />}{t.key === 'pedidos' && <Package className="mr-1.5 inline h-4 w-4" />}{t.label}
          </button>))}
      </nav>
      <div key={`${tab}-${version}`}>
        {tab === 'geral' && <Geral go={go} />}
        {tab === 'catalogo' && <Catalogo cart={cart} setCart={setCart} />}
        {tab === 'pedidos' && <Pedidos />}
        {tab === 'cashback' && <Cashback />}
        {tab === 'financeiro' && <Financeiro />}
        {tab === 'mensagens' && <Mensagens />}
      </div>
      <CartDrawer cart={cart} setCart={setCart} open={open} onClose={() => setOpen(false)} onDone={() => { setVersion(v => v + 1); setToast('Pedido feito! Acompanhe em Pedidos.'); setTimeout(() => setToast(''), 3500); go('pedidos'); }} />
      {toast && <div role="status" className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background">{toast}</div>}
    </div>
  );
}

export default function MarketplacePage() {
  return <Suspense fallback={null}><MarketplaceInner /></Suspense>;
}
