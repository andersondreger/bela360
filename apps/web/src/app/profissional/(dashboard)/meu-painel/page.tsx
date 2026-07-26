'use client';

import { useState, useEffect } from 'react';
import {
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  Clock,
  Star,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { Skeleton, SkeletonCard, SkeletonList } from '@/components/Skeleton';
import { PageHeader, Badge } from '@/components/ui';
import { professionalApi, appointmentsApi, type Appointment, type AppointmentStatus } from '@/lib/api';
import { fetchCurrentUser } from '@/lib/auth';

interface DashboardStats {
  todayAppointments: number;
  weekAppointments: number;
  monthRevenue: number;
  pendingCommission: number;
  totalClients: number;
  averageRating: number;
  nextAppointment?: {
    clientName: string;
    serviceName: string;
    time: string;
  };
}

interface TodayAppointment {
  id: string;
  time: string;
  clientName: string;
  serviceName: string;
  status: AppointmentStatus;
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-white">
          <Icon className="w-4.5 h-4.5" />
        </div>
        <span className="text-muted-foreground text-sm">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday as first day
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateKey(date: Date | string): string {
  return new Date(date).toISOString().split('T')[0];
}

export default function ProfessionalDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    todayAppointments: 0,
    weekAppointments: 0,
    monthRevenue: 0,
    pendingCommission: 0,
    totalClients: 0,
    averageRating: 0,
  });
  const [todaySchedule, setTodaySchedule] = useState<TodayAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const user = await fetchCurrentUser();
        if (!user) {
          throw new Error('Sessão expirada');
        }

        const now = new Date();
        const weekStart = startOfWeek(now);
        const todayKey = toDateKey(now);

        const [dashboard, marketingStats, weekAppointments] = await Promise.all([
          professionalApi.getDashboard(),
          professionalApi.getMarketingStats().catch(() => null),
          appointmentsApi
            .list({
              professionalId: user.id,
              startDate: weekStart.toISOString(),
              endDate: now.toISOString(),
            })
            .catch(() => [] as Appointment[]),
        ]);

        const activeWeekAppointments = weekAppointments.filter(a => a.status !== 'CANCELLED');
        const todayAppointments = activeWeekAppointments
          .filter(a => toDateKey(a.startTime) === todayKey)
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

        const upcoming = todayAppointments.find(
          a => (a.status === 'PENDING' || a.status === 'CONFIRMED') && new Date(a.startTime).getTime() >= now.getTime()
        );

        setStats({
          todayAppointments: todayAppointments.length,
          weekAppointments: activeWeekAppointments.length,
          monthRevenue: Number(dashboard.thisMonth.revenue) || 0,
          pendingCommission: Number(dashboard.thisMonth.commission) || 0,
          totalClients: marketingStats?.allTime?.totalClients ?? dashboard.thisMonth.uniqueClients,
          averageRating: Number(dashboard.ratings.average) || 0,
          nextAppointment: upcoming
            ? {
                clientName: upcoming.client?.name || 'Cliente',
                serviceName: upcoming.service?.name || 'Servico',
                time: new Date(upcoming.startTime).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              }
            : undefined,
        });

        setTodaySchedule(
          todayAppointments.map(a => ({
            id: a.id,
            time: new Date(a.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            clientName: a.client?.name || 'Cliente',
            serviceName: a.service?.name || 'Servico',
            status: a.status,
          }))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar painel');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getStatusVariant = (status: string): 'success' | 'info' | 'warning' | 'outline' => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'CONFIRMED':
        return 'info';
      case 'PENDING':
        return 'warning';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'Concluido';
      case 'CONFIRMED':
        return 'Confirmado';
      case 'PENDING':
        return 'Aguardando';
      case 'CANCELLED':
        return 'Cancelado';
      case 'NO_SHOW':
        return 'Nao compareceu';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div>
          <Skeleton className="w-48 h-8 mb-2" />
          <Skeleton className="w-64 h-5" />
        </div>

        {/* Highlight card skeleton */}
        <Skeleton className="w-full h-32 rounded-xl" />

        {/* Stats grid skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>

        {/* Secondary stats skeleton */}
        <div className="grid grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>

        {/* List skeleton */}
        <SkeletonList count={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Meu Painel" description="Acompanhe seu desempenho e agenda" />
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-500/20 dark:bg-red-500/10">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Erro ao carregar painel</span>
          </div>
          <p className="mt-2 text-sm text-red-600 dark:text-red-400/80">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Meu Painel" description="Acompanhe seu desempenho e agenda" />

      {/* Next appointment highlight */}
      {stats.nextAppointment && (
        <div className="bg-gradient-brand rounded-2xl p-6 text-white shadow-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm mb-1">Proximo atendimento</p>
              <h3 className="text-xl font-bold">{stats.nextAppointment.clientName}</h3>
              <p className="text-white/90">{stats.nextAppointment.serviceName}</p>
            </div>
            <div className="text-right">
              <Clock className="w-8 h-8 text-white/80 mb-2 ml-auto" />
              <p className="text-2xl font-bold">{stats.nextAppointment.time}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Hoje" value={stats.todayAppointments.toString()} hint="atendimentos" icon={Calendar} />
        <StatCard label="Semana" value={stats.weekAppointments.toString()} hint="atendimentos" icon={TrendingUp} />
        <StatCard label="Faturado" value={formatCurrency(stats.monthRevenue)} hint="este mes" icon={DollarSign} />
        <StatCard label="Comissao" value={formatCurrency(stats.pendingCommission)} hint="a receber" icon={DollarSign} />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Meus Clientes</p>
              <p className="text-2xl font-bold text-foreground mt-1">{stats.totalClients}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand text-white">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Avaliacao Media</p>
              <p className="text-2xl font-bold text-foreground mt-1">{stats.averageRating.toFixed(1)}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/15">
              <Star className="w-5 h-5 text-gold-foreground dark:text-gold" />
            </div>
          </div>
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Agenda de Hoje</h2>
          <Link
            href="/profissional/agenda"
            className="text-primary text-sm font-medium flex items-center gap-1 hover:underline"
          >
            Ver completa <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="divide-y divide-border">
          {todaySchedule.map((appointment) => (
            <div key={appointment.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">{appointment.time}</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">{appointment.clientName}</p>
                  <p className="text-sm text-muted-foreground">{appointment.serviceName}</p>
                </div>
              </div>
              <Badge variant={getStatusVariant(appointment.status)}>
                {getStatusLabel(appointment.status)}
              </Badge>
            </div>
          ))}

          {todaySchedule.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              Nenhum atendimento agendado para hoje
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
