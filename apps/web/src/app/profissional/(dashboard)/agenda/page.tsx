'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Skeleton, SkeletonList } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/ui';
import { appointmentsApi, type AppointmentStatus } from '@/lib/api';
import { fetchCurrentUser } from '@/lib/auth';

interface Appointment {
  id: string;
  time: string;
  endTime: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  price: number;
  status: AppointmentStatus;
}

const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

function dayBounds(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export default function ProfessionalAgendaPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Generate week dates
  const getWeekDates = () => {
    const dates = [];
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const weekDates = getWeekDates();

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const user = await fetchCurrentUser();
        if (!user) throw new Error('Sessão expirada');

        const { start, end } = dayBounds(selectedDate);
        const data = await appointmentsApi.list({
          professionalId: user.id,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        });

        setAppointments(
          data
            .filter(a => a.status !== 'CANCELLED')
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
            .map(a => ({
              id: a.id,
              time: new Date(a.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              endTime: new Date(a.endTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              clientName: a.client?.name || 'Cliente',
              clientPhone: a.client?.phone || '',
              serviceName: a.service?.name || 'Serviço',
              price: Number(a.service?.price) || 0,
              status: a.status,
            }))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar agenda');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [selectedDate]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedDate(newDate);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'border-l-emerald-500 bg-emerald-50 dark:bg-emerald-500/5';
      case 'CONFIRMED':
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-500/5';
      case 'PENDING':
        return 'border-l-amber-500 bg-amber-50 dark:bg-amber-500/5';
      case 'CANCELLED':
        return 'border-l-destructive bg-red-50 dark:bg-red-500/5';
      case 'NO_SHOW':
        return 'border-l-muted-foreground bg-muted';
      default:
        return 'border-l-border bg-card';
    }
  };

  const formatCurrency = (value: number | string) => {
    return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Minha Agenda" description="Seus atendimentos agendados" />

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Week Navigation */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateWeek('prev')}
            className="p-2 hover:bg-muted rounded-xl transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>

          <h2 className="font-semibold text-foreground">
            {selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </h2>

          <button
            onClick={() => navigateWeek('next')}
            className="p-2 hover:bg-muted rounded-xl transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {weekDates.map((date, index) => (
            <button
              key={index}
              onClick={() => setSelectedDate(date)}
              className={`p-3 rounded-xl text-center transition-all ${
                isSelected(date)
                  ? 'bg-gradient-brand text-white shadow-glow'
                  : isToday(date)
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              <p className="text-xs font-medium">{weekDays[date.getDay()]}</p>
              <p className="text-lg font-bold">{date.getDate()}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Day Summary */}
      <div className="flex items-center justify-between bg-accent rounded-2xl p-4">
        <div>
          <p className="text-primary text-sm">
            {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <p className="text-xl font-bold text-foreground">{appointments.length} atendimentos</p>
        </div>
        <div className="text-right">
          <p className="text-primary text-sm">Total do dia</p>
          <p className="text-xl font-bold text-foreground">
            {formatCurrency(appointments.reduce((sum, a) => sum + a.price, 0))}
          </p>
        </div>
      </div>

      {/* Appointments List */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-4">
            <SkeletonList count={4} />
          </div>
        ) : appointments.length > 0 ? (
          appointments.map((appointment) => (
            <div
              key={appointment.id}
              className={`rounded-2xl border border-border p-4 border-l-4 shadow-sm ${getStatusColor(appointment.status)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="text-center bg-muted rounded-xl p-3">
                    <Clock className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                    <p className="font-bold text-foreground">{appointment.time}</p>
                    <p className="text-xs text-muted-foreground">{appointment.endTime}</p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-foreground">{appointment.clientName}</h3>
                    <p className="text-muted-foreground">{appointment.serviceName}</p>
                    <p className="text-sm text-muted-foreground mt-1">{appointment.clientPhone}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-bold text-primary">{formatCurrency(appointment.price)}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-border bg-card">
            <EmptyState
              icon="calendar"
              title="Agenda livre"
              description="Nenhum atendimento agendado para este dia"
            />
          </div>
        )}
      </div>
    </div>
  );
}
