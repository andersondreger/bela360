'use client';

import { useState, useEffect } from 'react';
import {
  Trophy,
  Target,
  Star,
  TrendingUp,
  Award,
  Users,
  DollarSign,
  Calendar,
  Medal,
  Share2,
  Instagram,
  AlertCircle,
} from 'lucide-react';
import { Button, Card, CardContent, Badge as UiBadge, PageHeader } from '@/components/ui';
import {
  professionalApi,
  isPremiumLockedError,
  type ProfessionalDashboard,
  type ProfessionalBadge,
} from '@/lib/api';

export default function PerfilPage() {
  const [dashboard, setDashboard] = useState<ProfessionalDashboard | null>(null);
  const [badges, setBadges] = useState<ProfessionalBadge[]>([]);
  const [totalProfessionals, setTotalProfessionals] = useState(0);
  const [profileLink, setProfileLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sharing, setSharing] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [dash, badgeList, ranking, marketing] = await Promise.all([
          professionalApi.getDashboard(),
          professionalApi.getBadges(),
          professionalApi.getRanking().catch(() => []),
          professionalApi.getMarketing().catch(() => null),
        ]);

        setDashboard(dash);
        setBadges(badgeList);
        setTotalProfessionals(ranking.length);
        setProfileLink(marketing?.links?.profileLink || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar perfil');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const handleShare = async () => {
    setSharing(true);
    setShareMessage(null);
    setShareError(null);
    try {
      const result = await professionalApi.sendMarketing({
        message: profileLink
          ? `Confira meu perfil no bela360 e agende seu horário: ${profileLink}`
          : undefined,
      });
      setShareMessage(result?.message || 'Perfil compartilhado com seus clientes!');
    } catch (err) {
      if (isPremiumLockedError(err)) {
        setShareError(
          'Este recurso faz parte do plano premium do bela360. Peça um cupom de desbloqueio em Configurações > Plano.'
        );
      } else {
        setShareError(err instanceof Error ? err.message : 'Erro ao compartilhar perfil');
      }
    } finally {
      setSharing(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(value) || 0);
  };

  const goalLabels: Record<string, string> = {
    REVENUE: 'Faturamento',
    APPOINTMENTS: 'Atendimentos',
    NEW_CLIENTS: 'Novos Clientes',
    RATING: 'Avaliacao Media',
    RETURN_RATE: 'Taxa de Retorno',
  };

  const getProgress = (current: number, target: number) => {
    if (!target || target <= 0) return 0;
    return Math.min((Number(current) / Number(target)) * 100, 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-emerald-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Meu Perfil Profissional" description="Acompanhe seu desempenho, metas e conquistas" />
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-500/20 dark:bg-red-500/10">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Erro ao carregar perfil</span>
          </div>
          <p className="mt-2 text-sm text-red-600 dark:text-red-400/80">{error}</p>
        </div>
      </div>
    );
  }

  const ranking = dashboard?.ranking
    ? { position: dashboard.ranking.position ?? 0, totalProfessionals }
    : null;
  const goals = dashboard?.goals || [];
  const loyalClients = dashboard?.loyalClients || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meu Perfil Profissional"
        description="Acompanhe seu desempenho, metas e conquistas"
        actions={
          <>
            <Button variant="outline" onClick={handleShare} loading={sharing}>
              <Share2 className="h-4 w-4" />
              Compartilhar Perfil
            </Button>
            <Button variant="primary">
              <Instagram className="h-4 w-4" />
              Editar Perfil
            </Button>
          </>
        }
      />

      {shareMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
          {shareMessage}
        </div>
      )}
      {shareError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          {shareError}
        </div>
      )}

      {/* Ranking Banner */}
      {ranking && (
        <div className="bg-gradient-brand text-white rounded-2xl p-6 flex items-center justify-between shadow-glow">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/20 rounded-full">
              <Trophy className="h-10 w-10" />
            </div>
            <div>
              <p className="text-lg opacity-90">Ranking do Mes</p>
              <p className="text-4xl font-bold">#{ranking.position}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-75">de {ranking.totalProfessionals} profissionais</p>
            {ranking.position > 0 && ranking.position <= 3 && (
              <UiBadge className="mt-2 gap-1 bg-white/20 text-white">
                <Medal className="h-4 w-4" />
                Top 3 do Salao!
              </UiBadge>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Atendimentos</p>
              <Calendar className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold">{dashboard?.thisMonth.appointments ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">este mes</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Faturamento</p>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(dashboard?.thisMonth.revenue || 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">este mes</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Comissao</p>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(dashboard?.thisMonth.commission || 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">a receber</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Avaliacao</p>
              <Star className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {Number(dashboard?.ratings.average || 0).toFixed(1)} <span className="text-sm font-normal text-muted-foreground">/ 5</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">{dashboard?.ratings.total ?? 0} avaliacoes</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Goals */}
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Target className="h-5 w-5" />
              Metas do Mes
            </h2>
            <div className="space-y-4">
              {goals.map((goal) => {
                const percentage = getProgress(goal.currentValue, goal.targetValue);
                const isMonetary = goal.type === 'REVENUE';

                return (
                  <div key={goal.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{goalLabels[goal.type] || goal.type}</span>
                        {goal.bonusAmount && (
                          <UiBadge variant="success">
                            +{formatCurrency(goal.bonusAmount)} bonus
                          </UiBadge>
                        )}
                      </div>
                      <span className="text-sm">
                        {isMonetary ? formatCurrency(goal.currentValue) : Number(goal.currentValue)} / {isMonetary ? formatCurrency(goal.targetValue) : Number(goal.targetValue)}
                      </span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getProgressColor(percentage)}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-right">
                      {percentage.toFixed(0)}% concluido
                    </p>
                  </div>
                );
              })}

              {goals.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma meta definida para este mes.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Loyal Clients */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Clientes Fieis
            </h2>
            <div className="space-y-3">
              {loyalClients.map((client, index) => (
                <div key={client.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' :
                      index === 1 ? 'bg-muted text-muted-foreground' :
                      index === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="font-medium">{client.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{client.visits} visitas</span>
                </div>
              ))}

              {loyalClients.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum cliente recorrente ainda.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Badges */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Award className="h-5 w-5" />
            Minhas Conquistas
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className="flex flex-col items-center p-4 bg-gradient-to-b from-muted/50 to-muted rounded-2xl text-center"
              >
                <div className="p-3 bg-gold/15 rounded-full mb-2">
                  <Award className="h-6 w-6 text-gold-foreground dark:text-gold" />
                </div>
                <p className="font-medium text-sm">{badge.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{badge.description}</p>
              </div>
            ))}

            {/* Placeholder for locked badges */}
            {Array.from({ length: Math.max(3 - badges.length, 0) }).map((_, i) => (
              <div
                key={`locked-${i}`}
                className="flex flex-col items-center p-4 bg-muted/30 rounded-2xl text-center opacity-50"
              >
                <div className="p-3 bg-muted rounded-full mb-2">
                  <Award className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="font-medium text-sm text-muted-foreground">???</p>
                <p className="text-xs text-muted-foreground mt-1">Continue trabalhando!</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
