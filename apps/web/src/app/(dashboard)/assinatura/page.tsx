'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Crown, Sparkles, AlertTriangle, ExternalLink } from 'lucide-react';
import { Button, Card, PageHeader, Badge, Input } from '@/components/ui';
import { billingApi, type BillingOverview } from '@/lib/api';

const PREMIUM_FEATURES = [
  'Campanhas de marketing e segmentação de clientes',
  'Automação de relacionamento (pós-atendimento, retorno, aniversário, reativação)',
  'Programa de fidelidade com pontos e recompensas',
  'Controle de estoque com alertas',
];

const ALWAYS_FREE = ['Agenda inteligente', 'Cadastro e histórico de clientes', 'Financeiro e comissões', 'Atendimento pelo WhatsApp'];

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

const STATUS_LABEL: Record<string, { text: string; variant: 'success' | 'warning' | 'destructive' | 'info' }> = {
  ACTIVE: { text: 'Assinatura ativa', variant: 'success' },
  PENDING_PAYMENT: { text: 'Aguardando 1º pagamento', variant: 'info' },
  OVERDUE: { text: 'Pagamento em atraso', variant: 'destructive' },
  CANCELLED: { text: 'Assinatura cancelada', variant: 'warning' },
};

export default function AssinaturaPage() {
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const [document, setDocument] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setOverview(await billingApi.getOverview());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar sua assinatura.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCheckout = async () => {
    setWorking(true);
    setError('');
    try {
      const { checkoutUrl } = await billingApi.checkout(document.replace(/\D/g, '') || undefined);
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }
      await load();
      setError('A cobrança foi criada, mas o link de pagamento ainda não está pronto. Atualize a página em instantes.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível iniciar o checkout.');
    } finally {
      setWorking(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancelar a assinatura? Os recursos premium ficam bloqueados no fim do ciclo já pago.')) return;
    setWorking(true);
    setError('');
    try {
      await billingApi.cancel();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível cancelar.');
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  const trial = overview?.trial ?? null;
  const sub = overview?.subscription ?? null;
  const price = overview?.price ?? 97;
  const isActive = sub?.status === 'ACTIVE';
  const needsDocument = !sub && !isActive;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assinatura"
        description="Plano Premium do bela360 — libera marketing, automação, fidelidade e estoque."
      />

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Estado atual */}
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-r from-bela-gold via-amber-500 to-orange-500 text-white">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Plano Premium</p>
              <p className="text-xs text-muted-foreground">
                R$ {price}/mês · cobrança recorrente via Pix, boleto ou cartão
              </p>
            </div>
          </div>
          {sub && STATUS_LABEL[sub.status] && (
            <Badge variant={STATUS_LABEL[sub.status].variant}>{STATUS_LABEL[sub.status].text}</Badge>
          )}
          {!sub && trial?.active && (
            <Badge variant="info">
              Teste grátis · {trial.daysLeft} {trial.daysLeft === 1 ? 'dia restante' : 'dias restantes'}
            </Badge>
          )}
          {!sub && trial && !trial.active && <Badge variant="warning">Teste encerrado</Badge>}
        </div>

        <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          {trial && (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Teste completo (7 dias)</p>
              <p className="font-medium">
                {trial.active ? `Termina em ${formatDate(trial.endsAt)}` : `Terminou em ${formatDate(trial.endsAt)}`}
              </p>
            </div>
          )}
          {sub && (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">
                {isActive ? 'Próxima cobrança' : 'Primeira cobrança'}
              </p>
              <p className="font-medium">{formatDate(sub.nextDueDate)}</p>
            </div>
          )}
        </div>

        {/* Ação */}
        <div className="mt-6">
          {overview && !overview.billingConfigured ? (
            <p className="text-sm text-muted-foreground">
              A cobrança automática ainda não está ativa nesta instalação. Fale com o suporte do bela360 pelo WhatsApp
              para liberar o plano manualmente.
            </p>
          ) : isActive ? (
            <Button variant="outline" onClick={handleCancel} loading={working}>
              Cancelar assinatura
            </Button>
          ) : (
            <div className="space-y-3">
              {needsDocument && (
                <Input
                  label="CPF ou CNPJ do responsável (exigido pelo emissor da cobrança)"
                  value={document}
                  onChange={(e) => setDocument(e.target.value)}
                  placeholder="000.000.000-00"
                  maxLength={18}
                />
              )}
              <Button onClick={handleCheckout} loading={working} size="lg">
                {trial?.active ? 'Assinar agora (só cobra no fim do teste)' : 'Assinar plano Premium'}
                <ExternalLink className="h-4 w-4" />
              </Button>
              {trial?.active && (
                <p className="text-xs text-muted-foreground">
                  Você não perde nada assinando agora: a primeira fatura só vence em {formatDate(trial.endsAt)}, quando
                  o teste acaba.
                </p>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* O que entra */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-bela-gold" />
            <h3 className="text-sm font-semibold">Recursos Premium</h3>
          </div>
          <ul className="space-y-2">
            {PREMIUM_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-bela-violet" />
                {f}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-6">
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-semibold">Sempre liberado (mesmo sem assinar)</h3>
          </div>
          <ul className="space-y-2">
            {ALWAYS_FREE.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                {f}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
