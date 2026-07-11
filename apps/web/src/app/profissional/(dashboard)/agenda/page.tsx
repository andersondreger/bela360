'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Skeleton, SkeletonList } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/ui';

interface Appointment {
  id: string;
  time: string;
  endTime: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  price: number;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
}

const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

export default function ProfessionalAgendaPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

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
    // Simulated data - in production would fetch from API
    setAppointments([
      {
        id: '1',
        time: '09:00',
        endTime: '10:00',
        clientName: 'Ana Paula',
        clientPhone: '(11) 99999-1111',
        serviceName: 'Corte Feminino',
        price: 80,
        status: 'CONFIRMED',
      },
      {
        id: '2',
        time: '10:30',
        endTime: '11:00',
        clientName: 'Carlos Lima',
        clientPhone: '(11) 99999-2222',
        serviceName: 'Corte Masculino',
        price: 45,
        status: 'CONFIRMED',
      },
      {
        id: '3',
        time: '14:00',
        endTime: '15:00',
        clientName: 'Maria Silva',
        clientPhone: '(11) 99999-3333',
        serviceName: 'Corte e Escova',
        price: 140,
        status: 'PENDING',
      },
      {
        id: '4',
        time: '16:00',
        endTime: '18:00',
        clientName: 'Fernanda Souza',
        clientPhone: '(11) 99999-4444',
        serviceName: 'Coloracao',
        price: 180,
        status: 'CONFIRMED',
      },
    ]);
    setLoading(false);
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

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Minha Agenda" description="Seus atendimentos agendados" />

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
