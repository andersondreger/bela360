'use client';

import { useState, useEffect } from 'react';
import { Clock, UserPlus, Phone, Calendar, Sun, Sunset, Moon, X, Users } from 'lucide-react';
import { Button, Badge, PageHeader } from '@/components/ui';

interface WaitlistEntry {
  id: string;
  client: { name: string; phone: string };
  service: { name: string };
  professional?: { name: string };
  desiredDate: string;
  desiredPeriod: string;
  status: string;
  priority: number;
  createdAt: string;
}

const periodIcons = {
  MORNING: Sun,
  AFTERNOON: Sunset,
  EVENING: Moon,
  ANY: Clock,
};

const periodLabels = {
  MORNING: 'Manhã',
  AFTERNOON: 'Tarde',
  EVENING: 'Noite',
  ANY: 'Qualquer',
};

function statusBadgeVariant(status: string): 'warning' | 'info' | 'success' {
  if (status === 'WAITING') return 'warning';
  if (status === 'NOTIFIED') return 'info';
  return 'success';
}

function statusLabel(status: string): string {
  if (status === 'WAITING') return 'Aguardando';
  if (status === 'NOTIFIED') return 'Notificado';
  return 'Convertido';
}

export default function ListaEsperaPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    // Simulated data - replace with API call
    setEntries([
      {
        id: '1',
        client: { name: 'Maria Silva', phone: '(11) 99999-0001' },
        service: { name: 'Corte Feminino' },
        professional: { name: 'Ana Paula' },
        desiredDate: '2026-01-10',
        desiredPeriod: 'MORNING',
        status: 'WAITING',
        priority: 1,
        createdAt: '2026-01-03',
      },
      {
        id: '2',
        client: { name: 'João Santos', phone: '(11) 99999-0002' },
        service: { name: 'Barba' },
        desiredDate: '2026-01-08',
        desiredPeriod: 'AFTERNOON',
        status: 'WAITING',
        priority: 2,
        createdAt: '2026-01-04',
      },
      {
        id: '3',
        client: { name: 'Carla Oliveira', phone: '(11) 99999-0003' },
        service: { name: 'Manicure' },
        desiredDate: '2026-01-07',
        desiredPeriod: 'ANY',
        status: 'NOTIFIED',
        priority: 3,
        createdAt: '2026-01-02',
      },
    ]);
    setLoading(false);
  }, []);

  const handleNotify = (id: string) => {
    setEntries(prev =>
      prev.map(e => (e.id === id ? { ...e, status: 'NOTIFIED' } : e))
    );
  };

  const handleRemove = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
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
        title="Lista de Espera"
        description="Gerencie clientes aguardando horários disponíveis"
        actions={
          <Button onClick={() => setShowAddModal(true)}>
            <UserPlus className="h-4 w-4" />
            Adicionar
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Aguardando</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-white">
              <Clock className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-amber-500">
            {entries.filter(e => e.status === 'WAITING').length}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Notificados</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-white">
              <Phone className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-blue-500">
            {entries.filter(e => e.status === 'NOTIFIED').length}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total na Lista</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-white">
              <Users className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold">{entries.length}</p>
        </div>
      </div>

      {/* Waitlist Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-4 font-medium">#</th>
              <th className="text-left p-4 font-medium">Cliente</th>
              <th className="text-left p-4 font-medium">Serviço</th>
              <th className="text-left p-4 font-medium">Data Desejada</th>
              <th className="text-left p-4 font-medium">Período</th>
              <th className="text-left p-4 font-medium">Status</th>
              <th className="text-left p-4 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => {
              const PeriodIcon = periodIcons[entry.desiredPeriod as keyof typeof periodIcons] || Clock;
              return (
                <tr key={entry.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-4 text-muted-foreground">{index + 1}</td>
                  <td className="p-4">
                    <div>
                      <p className="font-medium">{entry.client.name}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {entry.client.phone}
                      </p>
                    </div>
                  </td>
                  <td className="p-4">
                    <p>{entry.service.name}</p>
                    {entry.professional && (
                      <p className="text-sm text-muted-foreground">
                        c/ {entry.professional.name}
                      </p>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {new Date(entry.desiredDate).toLocaleDateString('pt-BR')}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <PeriodIcon className="h-4 w-4 text-muted-foreground" />
                      {periodLabels[entry.desiredPeriod as keyof typeof periodLabels]}
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant={statusBadgeVariant(entry.status)}>
                      {statusLabel(entry.status)}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {entry.status === 'WAITING' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-blue-500"
                          onClick={() => handleNotify(entry.id)}
                          title="Notificar"
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive"
                        onClick={() => handleRemove(entry.id)}
                        title="Remover"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {entries.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            Nenhum cliente na lista de espera
          </div>
        )}
      </div>
    </div>
  );
}
