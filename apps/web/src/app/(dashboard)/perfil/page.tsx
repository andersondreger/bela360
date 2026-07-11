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
} from 'lucide-react';
import { Button, Card, CardContent, Badge as UiBadge, PageHeader } from '@/components/ui';

interface ProfileStats {
  thisMonth: {
    appointments: number;
    revenue: number;
    commission: number;
    uniqueClients: number;
  };
  ratings: {
    average: number;
    total: number;
  };
  ranking: {
    position: number;
    totalProfessionals: number;
  } | null;
}

interface Goal {
  id: string;
  type: string;
  targetValue: number;
  currentValue: number;
  bonusAmount?: number;
}

interface Badge {
  id: string;
  type: string;
  name: string;
  description: string;
  iconUrl?: string;
  earnedAt: string;
}

interface LoyalClient {
  id: string;
  name: string;
  visits: number;
}

export default function PerfilPage() {
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loyalClients, setLoyalClients] = useState<LoyalClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated data - replace with API call
    setStats({
      thisMonth: {
        appointments: 42,
        revenue: 8750.00,
        commission: 2625.00,
        uniqueClients: 28,
      },
      ratings: {
        average: 4.8,
        total: 156,
      },
      ranking: {
        position: 2,
        totalProfessionals: 8,
      },
    });
    setGoals([
      { id: '1', type: 'REVENUE', targetValue: 10000, currentValue: 8750, bonusAmount: 200 },
      { id: '2', type: 'APPOINTMENTS', targetValue: 50, currentValue: 42 },
      { id: '3', type: 'NEW_CLIENTS', targetValue: 10, currentValue: 6 },
    ]);
    setBadges([
      { id: '1', type: 'TOP_RATED', name: 'Avaliacao Perfeita', description: '5 estrelas em 10 avaliacoes consecutivas', earnedAt: '2026-01-01' },
      { id: '2', type: 'HIGH_EARNER', name: 'Top Vendedor', description: 'Maior faturamento do mes', earnedAt: '2025-12-01' },
      { id: '3', type: 'LOYALTY_MASTER', name: 'Fidelizador', description: '20 clientes que retornaram 3x ou mais', earnedAt: '2025-11-15' },
    ]);
    setLoyalClients([
      { id: '1', name: 'Maria Silva', visits: 12 },
      { id: '2', name: 'Ana Costa', visits: 8 },
      { id: '3', name: 'Julia Santos', visits: 7 },
      { id: '4', name: 'Carla Oliveira', visits: 6 },
    ]);
    setLoading(false);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const goalLabels: Record<string, string> = {
    REVENUE: 'Faturamento',
    APPOINTMENTS: 'Atendimentos',
    NEW_CLIENTS: 'Novos Clientes',
    RATING: 'Avaliacao Media',
  };

  const getProgressColor = (current: number, target: number) => {
    const percentage = (current / target) * 100;
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meu Perfil Profissional"
        description="Acompanhe seu desempenho, metas e conquistas"
        actions={
          <>
            <Button variant="outline">
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

      {/* Ranking Banner */}
      {stats?.ranking && (
        <div className="bg-gradient-brand text-white rounded-2xl p-6 flex items-center justify-between shadow-glow">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/20 rounded-full">
              <Trophy className="h-10 w-10" />
            </div>
            <div>
              <p className="text-lg opacity-90">Ranking do Mes</p>
              <p className="text-4xl font-bold">#{stats.ranking.position}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-75">de {stats.ranking.totalProfessionals} profissionais</p>
            {stats.ranking.position <= 3 && (
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
            <p className="text-2xl font-bold">{stats?.thisMonth.appointments}</p>
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
              {formatCurrency(stats?.thisMonth.revenue || 0)}
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
              {formatCurrency(stats?.thisMonth.commission || 0)}
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
              {stats?.ratings.average.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">/ 5</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">{stats?.ratings.total} avaliacoes</p>
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
                const percentage = Math.min((goal.currentValue / goal.targetValue) * 100, 100);
                const isMonetary = goal.type === 'REVENUE';

                return (
                  <div key={goal.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{goalLabels[goal.type]}</span>
                        {goal.bonusAmount && (
                          <UiBadge variant="success">
                            +{formatCurrency(goal.bonusAmount)} bonus
                          </UiBadge>
                        )}
                      </div>
                      <span className="text-sm">
                        {isMonetary ? formatCurrency(goal.currentValue) : goal.currentValue} / {isMonetary ? formatCurrency(goal.targetValue) : goal.targetValue}
                      </span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getProgressColor(goal.currentValue, goal.targetValue)}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-right">
                      {percentage.toFixed(0)}% concluido
                    </p>
                  </div>
                );
              })}
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
            {[1, 2, 3].map((i) => (
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
