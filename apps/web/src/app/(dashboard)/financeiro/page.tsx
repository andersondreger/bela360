'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Banknote,
  QrCode,
  Calendar,
  Users,
  ArrowUpRight,
} from 'lucide-react';
import { ExportButton } from '@/components/ExportButton';
import { exportData, ExportFormat } from '@/lib/export';
import { Card, CardContent, PageHeader } from '@/components/ui';
import { api, financeApi, appointmentsApi, Appointment } from '@/lib/api';

interface FinancialSummary {
  totalRevenue: number;
  totalCommissions: number;
  businessProfit: number;
  transactionCount: number;
  averageTicket: number;
}

interface PaymentMethodTotal {
  method: string;
  total: number;
  count: number;
}

interface FinanceReportResponse {
  summary: FinancialSummary;
  byMethod: Array<{ method: string; _sum: { finalAmount: number | string | null }; _count: number }>;
}

interface CashRegisterData {
  totalRevenue: number | string;
  totalCommissions: number | string;
  businessProfit: number | string;
  isClosed: boolean;
}

interface PendingCommission {
  professional?: { id: string; name: string };
  pendingAmount: number;
  paymentCount: number;
}

const toNum = (v: number | string | null | undefined) => Number(v || 0);

function getDateRange(period: string): { startDate: string; endDate: string } {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  end.setDate(end.getDate() + 1); // exclusive upper bound so today's payments are fully included

  if (period === 'week') start.setDate(start.getDate() - 7);
  else if (period === 'month') start.setDate(1);
  else if (period === 'year') { start.setMonth(0); start.setDate(1); }

  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { startDate: fmt(start), endDate: fmt(end) };
}

export default function FinanceiroPage() {
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [byMethod, setByMethod] = useState<PaymentMethodTotal[]>([]);
  const [cashRegister, setCashRegister] = useState<CashRegisterData | null>(null);
  const [pendingCommissions, setPendingCommissions] = useState<PendingCommission[]>([]);
  const [payableAppointments, setPayableAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('month');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCloseCashModal, setShowCloseCashModal] = useState(false);
  const [showCommissionsModal, setShowCommissionsModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    appointmentId: '',
    amount: 0,
    method: 'PIX',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { startDate, endDate } = getDateRange(period);
      const [report, cash, pending, appts] = await Promise.all([
        financeApi.getReport(startDate, endDate) as Promise<FinanceReportResponse>,
        financeApi.getCashRegister().catch(() => null) as Promise<CashRegisterData | null>,
        api.get<PendingCommission[]>('/finance/commissions/pending').catch(() => []),
        appointmentsApi.list({ status: 'COMPLETED' }).catch(() => []),
      ]);

      setSummary(report.summary);
      setByMethod(
        (report.byMethod || []).map((m) => ({
          method: m.method,
          total: toNum(m._sum.finalAmount),
          count: m._count,
        }))
      );
      setCashRegister(cash);
      setPendingCommissions(pending || []);
      setPayableAppointments(appts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados financeiros');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  const methodIcons: Record<string, typeof DollarSign> = {
    PIX: QrCode,
    CREDIT_CARD: CreditCard,
    DEBIT_CARD: CreditCard,
    CASH: Banknote,
  };

  const methodLabels: Record<string, string> = {
    PIX: 'PIX',
    CREDIT_CARD: 'Cartão Crédito',
    DEBIT_CARD: 'Cartão Débito',
    CASH: 'Dinheiro',
    OTHER: 'Outro',
  };

  const handleCloseModals = () => {
    setShowPaymentModal(false);
    setShowCloseCashModal(false);
    setShowCommissionsModal(false);
    setPaymentData({ appointmentId: '', amount: 0, method: 'PIX', notes: '' });
  };

  const handleSelectAppointment = (appointmentId: string) => {
    const appt = payableAppointments.find((a) => a.id === appointmentId);
    setPaymentData((prev) => ({
      ...prev,
      appointmentId,
      amount: appt?.service?.price ? Number(appt.service.price) : prev.amount,
    }));
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentData.appointmentId || paymentData.amount <= 0) {
      alert('Selecione o agendamento e informe o valor');
      return;
    }

    setSaving(true);
    try {
      await financeApi.registerPayment({
        appointmentId: paymentData.appointmentId,
        amount: paymentData.amount,
        method: paymentData.method,
        notes: paymentData.notes || undefined,
      });
      await loadData();
      handleCloseModals();
      alert('Pagamento registrado com sucesso!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao registrar pagamento');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseCash = async () => {
    setSaving(true);
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      await financeApi.closeCashRegister(dateStr);
      await loadData();
      handleCloseModals();
      alert('Caixa fechado com sucesso! Relatorio gerado.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao fechar caixa');
    } finally {
      setSaving(false);
    }
  };

  const [exporting, setExporting] = useState(false);

  const handleExportReport = (format: ExportFormat) => {
    setExporting(true);
    try {
      const periodLabel = {
        today: 'Hoje',
        week: 'Esta Semana',
        month: 'Este Mês',
        year: 'Este Ano',
      }[period] || period;

      const data = {
        headers: ['Categoria', 'Métrica', 'Valor'],
        rows: [
          ['Resumo', 'Receita Total', formatCurrency(summary?.totalRevenue || 0)],
          ['Resumo', 'Comissões', formatCurrency(summary?.totalCommissions || 0)],
          ['Resumo', 'Lucro do Salão', formatCurrency(summary?.businessProfit || 0)],
          ['Resumo', 'Transações', summary?.transactionCount || 0],
          ['Resumo', 'Ticket Médio', formatCurrency(summary?.averageTicket || 0)],
          ...byMethod.map(m => [
            'Forma de Pagamento',
            methodLabels[m.method] || m.method,
            `${formatCurrency(m.total)} (${m.count} transações)`,
          ]),
        ],
      };

      exportData(data, format, {
        filename: `financeiro-${period}-${new Date().toISOString().split('T')[0]}`,
        title: 'Relatório Financeiro',
        subtitle: `Período: ${periodLabel}`,
      });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro"
        description="Controle de receitas, comissões e fechamento de caixa"
        actions={
          <>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="h-11 rounded-xl border border-input bg-background px-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            >
              <option value="today">Hoje</option>
              <option value="week">Esta Semana</option>
              <option value="month">Este Mês</option>
              <option value="year">Este Ano</option>
            </select>
            <ExportButton onExport={handleExportReport} loading={exporting} />
          </>
        }
      />

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Receita Total</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-white">
              <ArrowUpRight className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(summary?.totalRevenue || 0)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {summary?.transactionCount || 0} transações
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Comissões</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-white">
              <Users className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-amber-600 dark:text-amber-400">
            {formatCurrency(summary?.totalCommissions || 0)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {((summary?.totalCommissions || 0) / (summary?.totalRevenue || 1) * 100).toFixed(1)}% da receita
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Lucro do Salão</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-white">
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-cyan-600 dark:text-cyan-400">
            {formatCurrency(summary?.businessProfit || 0)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {((summary?.businessProfit || 0) / (summary?.totalRevenue || 1) * 100).toFixed(1)}% da receita
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Ticket Médio</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-white">
              <DollarSign className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-bela-purple">
            {formatCurrency(summary?.averageTicket || 0)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            por atendimento
          </p>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Por Forma de Pagamento</h2>
            <div className="space-y-4">
              {byMethod.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum pagamento registrado no período.</p>
              )}
              {byMethod.map((method) => {
                const Icon = methodIcons[method.method] || DollarSign;
                const percentage = (method.total / (summary?.totalRevenue || 1)) * 100;

                return (
                  <div key={method.method} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {methodLabels[method.method] || method.method}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatCurrency(method.total)}</p>
                        <p className="text-xs text-muted-foreground">{method.count} transações</p>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-brand rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Ações Rápidas</h2>
            <div className="grid gap-3">
              <button
                onClick={() => setShowPaymentModal(true)}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl hover:bg-muted transition-colors text-left"
              >
                <div className="p-2 bg-emerald-100 dark:bg-emerald-500/15 rounded-xl">
                  <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="font-medium">Registrar Pagamento</p>
                  <p className="text-sm text-muted-foreground">Adicionar novo pagamento</p>
                </div>
              </button>

              <button
                onClick={() => setShowCloseCashModal(true)}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl hover:bg-muted transition-colors text-left"
              >
                <div className="p-2 bg-cyan-100 dark:bg-cyan-500/15 rounded-xl">
                  <Calendar className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <p className="font-medium">Fechar Caixa</p>
                  <p className="text-sm text-muted-foreground">Finalizar o dia</p>
                </div>
              </button>

              <button
                onClick={() => setShowCommissionsModal(true)}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl hover:bg-muted transition-colors text-left"
              >
                <div className="p-2 bg-bela-purple/10 rounded-xl">
                  <Users className="h-5 w-5 text-bela-purple" />
                </div>
                <div>
                  <p className="font-medium">Comissões Pendentes</p>
                  <p className="text-sm text-muted-foreground">Ver repasses</p>
                </div>
              </button>

              <button
                onClick={() => handleExportReport('xlsx')}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl hover:bg-muted transition-colors text-left"
              >
                <div className="p-2 bg-amber-100 dark:bg-amber-500/15 rounded-xl">
                  <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-medium">Relatório Completo</p>
                  <p className="text-sm text-muted-foreground">Exportar Excel</p>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Register Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Registrar Pagamento</h2>
            <form onSubmit={handleSubmitPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Agendamento *</label>
                <select
                  value={paymentData.appointmentId}
                  onChange={(e) => handleSelectAppointment(e.target.value)}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Selecione um atendimento concluído</option>
                  {payableAppointments.map((appt) => (
                    <option key={appt.id} value={appt.id}>
                      {appt.client?.name || 'Cliente'} - {appt.service?.name || 'Serviço'} ({formatDateTime(appt.startTime)})
                    </option>
                  ))}
                </select>
                {payableAppointments.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Nenhum agendamento concluído aguardando pagamento.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Valor (R$) *</label>
                <input
                  type="number"
                  value={paymentData.amount || ''}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Forma de Pagamento</label>
                <select
                  value={paymentData.method}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, method: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="PIX">PIX</option>
                  <option value="CREDIT_CARD">Cartão de Crédito</option>
                  <option value="DEBIT_CARD">Cartão de Débito</option>
                  <option value="CASH">Dinheiro</option>
                  <option value="OTHER">Outro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Observações</label>
                <input
                  type="text"
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Ex: Corte + Escova"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModals}
                  disabled={saving}
                  className="flex-1 px-4 py-2 border text-muted-foreground rounded-lg hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || payableAppointments.length === 0}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Cash Modal */}
      {showCloseCashModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Fechar Caixa</h2>
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Resumo do Dia</p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Receita Total:</span>
                    <span className="font-bold text-green-600">{formatCurrency(toNum(cashRegister?.totalRevenue))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Comissões:</span>
                    <span className="font-bold text-orange-600">{formatCurrency(toNum(cashRegister?.totalCommissions))}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span>Lucro do Salão:</span>
                    <span className="font-bold text-blue-600">{formatCurrency(toNum(cashRegister?.businessProfit))}</span>
                  </div>
                </div>
              </div>
              {cashRegister?.isClosed ? (
                <p className="text-sm text-amber-600">O caixa de hoje já foi fechado.</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Ao fechar o caixa, um relatório será gerado automaticamente e as comissões serão calculadas.
                </p>
              )}
              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleCloseModals}
                  disabled={saving}
                  className="flex-1 px-4 py-2 border text-muted-foreground rounded-lg hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCloseCash}
                  disabled={saving || !!cashRegister?.isClosed}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Fechando...' : 'Confirmar Fechamento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Commissions Modal */}
      {showCommissionsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">Comissões Pendentes</h2>
              <button onClick={handleCloseModals} className="text-muted-foreground hover:text-foreground">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              {pendingCommissions.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma comissão pendente.</p>
              )}
              {pendingCommissions.map((p) => (
                <div key={p.professional?.id || p.professional?.name} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{p.professional?.name || 'Profissional'}</p>
                    <p className="text-sm text-muted-foreground">{p.paymentCount} atendimentos</p>
                  </div>
                  <p className="font-bold text-purple-600">{formatCurrency(p.pendingAmount)}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between font-bold">
                <span>Total Pendente:</span>
                <span className="text-purple-600">
                  {formatCurrency(pendingCommissions.reduce((sum, p) => sum + p.pendingAmount, 0))}
                </span>
              </div>
            </div>
            <button
              onClick={handleCloseModals}
              className="w-full mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
