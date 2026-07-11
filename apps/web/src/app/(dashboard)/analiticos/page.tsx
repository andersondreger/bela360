'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  BarChart3,
  PieChart,
  UserCheck,
  UserX,
  Gift,
  Send,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  analyticsApi,
  DashboardStats,
  ServiceReport,
  ProfessionalReport,
  RetentionReport,
} from '@/lib/api';
import { ExportButton } from '@/components/ExportButton';
import {
  exportData,
  ExportFormat,
  prepareDashboardExport,
  prepareServiceExport,
  prepareProfessionalExport,
} from '@/lib/export';
import { Button, Card, CardContent, PageHeader } from '@/components/ui';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  loading,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down';
  trendValue?: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-4 bg-muted rounded w-20"></div>
          <div className="w-10 h-10 bg-muted rounded-xl"></div>
        </div>
        <div className="mt-4">
          <div className="h-8 bg-muted rounded w-24 mb-2"></div>
          <div className="h-3 bg-muted rounded w-16"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className="w-10 h-10 bg-gradient-brand rounded-xl flex items-center justify-center text-white">
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-4">
        <span className="text-3xl font-bold">{value}</span>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        {trend && trendValue && (
          <div className={`flex items-center gap-1 mt-2 text-sm ${
            trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {trend === 'up' ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            {trendValue}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AnaliticosPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('month');
  const [sendingCampaign, setSendingCampaign] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [services, setServices] = useState<ServiceReport[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalReport[]>([]);
  const [retention, setRetention] = useState<RetentionReport | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const endDate = new Date().toISOString().split('T')[0];
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          .toISOString()
          .split('T')[0];

        const [dashboardStats, serviceData, professionalData, retentionData] = await Promise.all([
          analyticsApi.getDashboard().catch(() => null),
          analyticsApi.getServiceReport(monthStart, endDate).catch(() => []),
          analyticsApi.getProfessionalReport(monthStart, endDate).catch(() => []),
          analyticsApi.getRetention().catch(() => null),
        ]);

        setStats(dashboardStats);
        setServices(serviceData || []);
        setProfessionals(professionalData || []);
        setRetention(retentionData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleSendBirthdayCampaign = async () => {
    setSendingCampaign('birthday');
    try {
      const result = await analyticsApi.sendBirthdayMessages();
      alert(`${result.sentCount} mensagens de aniversario enviadas!`);
    } catch {
      alert('Erro ao enviar mensagens de aniversario');
    } finally {
      setSendingCampaign(null);
    }
  };

  const handleSendReactivationCampaign = async () => {
    setSendingCampaign('reactivation');
    try {
      const result = await analyticsApi.sendReactivationCampaign(60);
      alert(`${result.sentCount} mensagens de reativacao enviadas!`);
    } catch {
      alert('Erro ao enviar campanha de reativacao');
    } finally {
      setSendingCampaign(null);
    }
  };

  const handleExport = (format: ExportFormat) => {
    if (!stats) return;
    const data = prepareDashboardExport(stats);
    exportData(data, format, {
      filename: `analiticos-${new Date().toISOString().split('T')[0]}`,
      title: 'Relatório Analítico',
      subtitle: `Período: ${selectedPeriod === 'today' ? 'Hoje' : selectedPeriod === 'week' ? 'Semana' : 'Mês'}`,
    });
  };

  const handleExportServices = (format: ExportFormat) => {
    if (!services.length) return;
    const data = prepareServiceExport(services);
    exportData(data, format, {
      filename: `servicos-${new Date().toISOString().split('T')[0]}`,
      title: 'Relatório de Serviços',
      subtitle: 'Serviços mais realizados do mês',
    });
  };

  const handleExportProfessionals = (format: ExportFormat) => {
    if (!professionals.length) return;
    const data = prepareProfessionalExport(professionals);
    exportData(data, format, {
      filename: `profissionais-${new Date().toISOString().split('T')[0]}`,
      title: 'Desempenho por Profissional',
      subtitle: 'Métricas do mês atual',
    });
  };

  // Get current period stats
  const currentStats = stats ? {
    revenue: stats[selectedPeriod].revenue,
    appointments: stats[selectedPeriod].appointments,
    confirmationRate: stats.confirmationRate,
    averageTicket: stats.averageTicket,
    completed: selectedPeriod === 'today' ? stats.today.completed : undefined,
  } : null;

  // Top services from stats
  const topServices = stats?.month.topServices || [];

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Analíticos" description="Acompanhe o desempenho do seu negócio" />
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-500/20 dark:bg-red-500/10">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Erro ao carregar dados</span>
          </div>
          <p className="mt-2 text-sm text-red-600 dark:text-red-400/80">{error}</p>
          <Button
            variant="outline"
            className="mt-4 border-red-200 text-red-700 hover:bg-red-100 dark:border-red-500/20 dark:text-red-400"
            onClick={() => window.location.reload()}
          >
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analíticos"
        description="Acompanhe o desempenho do seu negócio"
        actions={
          <>
            <div className="flex gap-2">
              {(['today', 'week', 'month'] as const).map((period) => (
                <Button
                  key={period}
                  size="sm"
                  variant={selectedPeriod === period ? 'primary' : 'ghost'}
                  onClick={() => setSelectedPeriod(period)}
                >
                  {period === 'today' ? 'Hoje' : period === 'week' ? 'Semana' : 'Mês'}
                </Button>
              ))}
            </div>
            <ExportButton onExport={handleExport} disabled={loading || !stats} />
          </>
        }
      />

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Receita"
          value={currentStats ? formatCurrency(currentStats.revenue) : '-'}
          icon={DollarSign}
          loading={loading}
        />
        <StatCard
          title="Agendamentos"
          value={currentStats?.appointments || 0}
          subtitle={currentStats?.completed ? `${currentStats.completed} concluídos` : undefined}
          icon={Calendar}
          loading={loading}
        />
        <StatCard
          title="Taxa de Confirmação"
          value={currentStats ? `${currentStats.confirmationRate}%` : '-'}
          icon={UserCheck}
          trend={currentStats && currentStats.confirmationRate >= 80 ? 'up' : 'down'}
          trendValue={currentStats && currentStats.confirmationRate >= 80 ? 'Boa taxa' : 'Melhorar'}
          loading={loading}
        />
        <StatCard
          title="Ticket Médio"
          value={currentStats ? formatCurrency(currentStats.averageTicket) : '-'}
          icon={BarChart3}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Services */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Serviços Mais Realizados</h2>
              </div>
              {services.length > 0 && (
                <button
                  onClick={() => handleExportServices('xlsx')}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  Exportar
                </button>
              )}
            </div>
            {loading ? (
              <div className="space-y-4">
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex justify-between mb-1">
                      <div className="h-4 bg-muted rounded w-24"></div>
                      <div className="h-4 bg-muted rounded w-16"></div>
                    </div>
                    <div className="h-2 bg-muted rounded-full"></div>
                  </div>
                ))}
              </div>
            ) : topServices.length > 0 ? (
              <div className="space-y-4">
                {topServices.map((service) => {
                  const maxCount = topServices[0].count;
                  const percentage = (service.count / maxCount) * 100;
                  return (
                    <div key={service.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">{service.name}</span>
                        <span className="text-sm text-muted-foreground">{service.count} atendimentos</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-brand rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Sem dados de serviços no período
              </div>
            )}
          </CardContent>
        </Card>

        {/* Professional Performance */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Desempenho por Profissional</h2>
              </div>
              {professionals.length > 0 && (
                <button
                  onClick={() => handleExportProfessionals('xlsx')}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  Exportar
                </button>
              )}
            </div>
            {loading ? (
              <div className="space-y-4">
                {Array(3).fill(0).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-xl animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-muted-foreground/20 rounded-full"></div>
                      <div>
                        <div className="h-4 bg-muted-foreground/20 rounded w-24 mb-1"></div>
                        <div className="h-3 bg-muted-foreground/20 rounded w-16"></div>
                      </div>
                    </div>
                    <div className="h-4 bg-muted-foreground/20 rounded w-20"></div>
                  </div>
                ))}
              </div>
            ) : professionals.length > 0 ? (
              <div className="space-y-4">
                {professionals.map((prof, index) => (
                  <div key={prof.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-medium ${
                        index === 0 ? 'bg-amber-500' : index === 1 ? 'bg-muted-foreground/50' : 'bg-orange-400'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{prof.name}</p>
                        <p className="text-sm text-muted-foreground">{prof.appointments} atendimentos</p>
                      </div>
                    </div>
                    <span className="font-semibold">{formatCurrency(prof.revenue)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Sem dados de profissionais no período
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Retention & Campaigns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Retention */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <UserCheck className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Retenção de Clientes</h2>
            </div>
            {loading ? (
              <div className="grid grid-cols-2 gap-4">
                {Array(4).fill(0).map((_, i) => (
                  <div key={i} className="text-center p-4 bg-muted rounded-xl animate-pulse">
                    <div className="h-8 bg-muted-foreground/20 rounded w-12 mx-auto mb-2"></div>
                    <div className="h-4 bg-muted-foreground/20 rounded w-20 mx-auto"></div>
                  </div>
                ))}
              </div>
            ) : retention ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-primary/10 rounded-xl">
                    <p className="text-3xl font-bold text-primary">{retention.totalClients}</p>
                    <p className="text-sm text-muted-foreground mt-1">Total de Clientes</p>
                  </div>
                  <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{retention.activeClients}</p>
                    <p className="text-sm text-muted-foreground mt-1">Clientes Ativos</p>
                  </div>
                  <div className="text-center p-4 bg-amber-50 dark:bg-amber-500/10 rounded-xl">
                    <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{retention.newThisMonth}</p>
                    <p className="text-sm text-muted-foreground mt-1">Novos este Mês</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 dark:bg-red-500/10 rounded-xl">
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400">{retention.inactiveClients}</p>
                    <p className="text-sm text-muted-foreground mt-1">Inativos (+60 dias)</p>
                  </div>
                </div>
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Taxa de Retenção</span>
                    <span className="text-sm font-bold text-primary">{retention.retentionRate}%</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-brand rounded-full"
                      style={{ width: `${retention.retentionRate}%` }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Sem dados de retenção disponíveis
              </div>
            )}
          </CardContent>
        </Card>

        {/* Campaigns */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Send className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Campanhas</h2>
            </div>
            <div className="space-y-4">
              <div className="p-4 border border-border rounded-xl">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-bela-pink/15 rounded-xl flex items-center justify-center shrink-0">
                    <Gift className="w-6 h-6 text-bela-pink" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Aniversariantes do Dia</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Envie mensagens de parabéns com desconto especial para aniversariantes de hoje.
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      className="mt-3"
                      onClick={handleSendBirthdayCampaign}
                      disabled={sendingCampaign === 'birthday'}
                    >
                      {sendingCampaign === 'birthday' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Enviar Campanha
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-4 border border-border rounded-xl">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-500/15 rounded-xl flex items-center justify-center shrink-0">
                    <UserX className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Reativar Clientes Inativos</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Envie mensagens para {retention?.inactiveClients || 0} clientes que não visitam há mais de 60 dias.
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      className="mt-3"
                      onClick={handleSendReactivationCampaign}
                      disabled={sendingCampaign === 'reactivation'}
                    >
                      {sendingCampaign === 'reactivation' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Enviar Campanha
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
