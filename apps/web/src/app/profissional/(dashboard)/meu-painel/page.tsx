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
} from 'lucide-react';
import Link from 'next/link';
import { Skeleton, SkeletonCard, SkeletonList } from '@/components/Skeleton';
import { PageHeader, Badge } from '@/components/ui';

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
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED';
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

  useEffect(() => {
    // Simulated data - in production would fetch from API
    setStats({
      todayAppointments: 5,
      weekAppointments: 18,
      monthRevenue: 4850,
      pendingCommission: 1455,
      totalClients: 127,
      averageRating: 4.8,
      nextAppointment: {
        clientName: 'Maria Silva',
        serviceName: 'Corte e Escova',
        time: '14:30',
      },
    });

    setTodaySchedule([
      { id: '1', time: '09:00', clientName: 'Ana Paula', serviceName: 'Corte Feminino', status: 'COMPLETED' },
      { id: '2', time: '10:00', clientName: 'Carlos Lima', serviceName: 'Corte Masculino', status: 'COMPLETED' },
      { id: '3', time: '11:00', clientName: 'Juliana Costa', serviceName: 'Escova', status: 'CONFIRMED' },
      { id: '4', time: '14:30', clientName: 'Maria Silva', serviceName: 'Corte e Escova', status: 'PENDING' },
      { id: '5', time: '16:00', clientName: 'Fernanda Souza', serviceName: 'Coloracao', status: 'CONFIRMED' },
    ]);

    setLoading(false);
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
