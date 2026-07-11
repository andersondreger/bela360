'use client';

import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, CheckCircle, Clock } from 'lucide-react';
import { PageHeader, Select } from '@/components/ui';

interface CommissionEntry {
  id: string;
  paidAt: string;
  client: { id: string; name: string };
  appointment: {
    startTime: string;
    service: { id: string; name: string };
  };
  finalAmount: number;
  commissionRate: number;
  commissionAmount: number;
  commissionPayoutId: string | null;
}

interface CommissionSummary {
  pending: { amount: number; paymentCount: number; totalServicesValue: number };
  paid: { amount: number; payoutCount: number };
  awaitingPayout: { amount: number; payoutCount: number };
  total: { earned: number };
}

export default function ProfessionalComissoesPage() {
  const [period, setPeriod] = useState('current');
  const [summary, setSummary] = useState<CommissionSummary | null>(null);
  const [pendingEntries, setPendingEntries] = useState<CommissionEntry[]>([]);
  const [paidEntries, setPaidEntries] = useState<CommissionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const getDateRange = useCallback(() => {
    const now = new Date();
    let startDate: Date;
    const endDate = new Date();

    switch (period) {
      case 'last':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate.setDate(0); // Last day of previous month
        break;
      case 'last3':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      default: // current
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  }, [period]);

  useEffect(() => {
    const fetchCommissions = async () => {
      setLoading(true);
      setError('');

      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const { startDate, endDate } = getDateRange();

        // Fetch summary and entries in parallel
        const [summaryRes, entriesRes] = await Promise.all([
          fetch(`/api/finance/my/commissions?startDate=${startDate}&endDate=${endDate}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/finance/my/commission-entries?startDate=${startDate}&endDate=${endDate}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          setSummary(summaryData.data);
        }

        if (entriesRes.ok) {
          const entriesData = await entriesRes.json();
          setPendingEntries(entriesData.data.pending || []);
          setPaidEntries(entriesData.data.paid || []);
        }
      } catch {
        setError('Erro ao carregar comissoes');
      } finally {
        setLoading(false);
      }
    };

    fetchCommissions();
  }, [period, getDateRange]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Minhas Comissoes"
        description="Acompanhe seus ganhos"
        actions={
          <Select value={period} onChange={(e) => setPeriod(e.target.value)} className="w-48">
            <option value="current">Este mes</option>
            <option value="last">Mes passado</option>
            <option value="last3">Ultimos 3 meses</option>
          </Select>
        }
      />

      {/* Error message */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-brand rounded-2xl p-6 text-white shadow-glow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/20 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-white/80">Total Ganho</span>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(summary?.total.earned || 0)}</p>
          <p className="text-white/70 text-sm mt-1">No periodo selecionado</p>
        </div>

        <div className="rounded-2xl p-6 border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-100 dark:bg-amber-500/15 rounded-xl">
              <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-muted-foreground">A Receber</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{formatCurrency(summary?.pending.amount || 0)}</p>
          <p className="text-muted-foreground text-sm mt-1">{summary?.pending.paymentCount || 0} atendimentos</p>
        </div>

        <div className="rounded-2xl p-6 border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-500/15 rounded-xl">
              <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-muted-foreground">Pago</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{formatCurrency(summary?.paid.amount || 0)}</p>
          <p className="text-muted-foreground text-sm mt-1">{summary?.paid.payoutCount || 0} repasses</p>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {/* Pending Commissions */}
      {!loading && pendingEntries.length > 0 && (
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              A Receber
            </h2>
          </div>
          <div className="divide-y divide-border">
            {pendingEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">{formatDate(entry.paidAt)}</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{entry.client?.name || 'Cliente'}</p>
                    <p className="text-sm text-muted-foreground">{entry.appointment?.service?.name || 'Servico'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{formatCurrency(Number(entry.finalAmount))} x {Number(entry.commissionRate)}%</p>
                  <p className="font-bold text-primary">{formatCurrency(Number(entry.commissionAmount))}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border-t border-amber-100 dark:border-amber-500/20 flex items-center justify-between rounded-b-2xl">
            <span className="font-medium text-amber-800 dark:text-amber-400">Total a receber</span>
            <span className="font-bold text-amber-800 dark:text-amber-400">
              {formatCurrency(pendingEntries.reduce((sum, e) => sum + Number(e.commissionAmount), 0))}
            </span>
          </div>
        </div>
      )}

      {/* Paid Commissions */}
      {!loading && paidEntries.length > 0 && (
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              Pagos
            </h2>
          </div>
          <div className="divide-y divide-border">
            {paidEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-4 opacity-75">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">{formatDate(entry.paidAt)}</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{entry.client?.name || 'Cliente'}</p>
                    <p className="text-sm text-muted-foreground">{entry.appointment?.service?.name || 'Servico'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Incluido em repasse</p>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(Number(entry.commissionAmount))}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && pendingEntries.length === 0 && paidEntries.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <TrendingUp className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhuma comissao encontrada no periodo</p>
        </div>
      )}
    </div>
  );
}
