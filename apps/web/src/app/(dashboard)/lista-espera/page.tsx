'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock, UserPlus, Phone, Calendar, Sun, Sunset, Moon, X, Users } from 'lucide-react';
import { Button, Badge, PageHeader, Modal, Select, Input } from '@/components/ui';
import { api, waitlistApi, clientsApi, servicesApi, Client, Service } from '@/lib/api';

interface WaitlistEntry {
  id: string;
  client: { id: string; name: string; phone: string };
  service: { id: string; name: string };
  professional?: { id: string; name: string } | null;
  desiredDate: string;
  desiredPeriod: string;
  status: string;
  createdAt: string;
}

interface WaitlistStats {
  waiting: number;
  notified: number;
  converted: number;
  expired: number;
  total: number;
  conversionRate: number;
}

interface ProfessionalOption {
  id: string;
  name: string;
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

function statusBadgeVariant(status: string): 'warning' | 'info' | 'success' | 'outline' | 'destructive' {
  if (status === 'WAITING') return 'warning';
  if (status === 'NOTIFIED') return 'info';
  if (status === 'CONVERTED') return 'success';
  if (status === 'EXPIRED') return 'outline';
  if (status === 'CANCELLED') return 'destructive';
  return 'outline';
}

function statusLabel(status: string): string {
  if (status === 'WAITING') return 'Aguardando';
  if (status === 'NOTIFIED') return 'Notificado';
  if (status === 'CONVERTED') return 'Convertido';
  if (status === 'EXPIRED') return 'Expirado';
  if (status === 'CANCELLED') return 'Cancelado';
  return status;
}

const emptyForm = {
  clientId: '',
  serviceId: '',
  professionalId: '',
  desiredDate: '',
  desiredPeriod: 'ANY',
};

export default function ListaEsperaPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [stats, setStats] = useState<WaitlistStats | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statsData, entriesData, clientsData, servicesData, professionalsData] = await Promise.all([
        waitlistApi.getStats() as Promise<WaitlistStats>,
        waitlistApi.list() as Promise<WaitlistEntry[]>,
        clientsApi.list(),
        servicesApi.list(),
        api.get<ProfessionalOption[]>('/business/professionals'),
      ]);
      setStats(statsData);
      setEntries(entriesData.filter(e => e.status === 'WAITING' || e.status === 'NOTIFIED'));
      setClients(clientsData);
      setServices(servicesData);
      setProfessionals(professionalsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar lista de espera');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCloseModal = () => {
    setShowAddModal(false);
    setFormData(emptyForm);
  };

  const handleRemove = async (id: string) => {
    try {
      await waitlistApi.delete(id);
      setEntries(prev => prev.filter(e => e.id !== id));
      setStats(prev => (prev ? { ...prev, waiting: Math.max(0, prev.waiting - 1) } : prev));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao remover da lista de espera');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId || !formData.serviceId || !formData.desiredDate) {
      alert('Cliente, servico e data desejada sao obrigatorios');
      return;
    }

    setSaving(true);
    try {
      await waitlistApi.create({
        clientId: formData.clientId,
        serviceId: formData.serviceId,
        professionalId: formData.professionalId || undefined,
        desiredDate: formData.desiredDate,
        desiredPeriod: formData.desiredPeriod,
      });
      await loadData();
      handleCloseModal();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao adicionar a lista de espera');
    } finally {
      setSaving(false);
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
        title="Lista de Espera"
        description="Gerencie clientes aguardando horários disponíveis"
        actions={
          <Button onClick={() => setShowAddModal(true)}>
            <UserPlus className="h-4 w-4" />
            Adicionar
          </Button>
        }
      />

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

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
            {stats?.waiting ?? entries.filter(e => e.status === 'WAITING').length}
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
            {stats?.notified ?? entries.filter(e => e.status === 'NOTIFIED').length}
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
                      {periodLabels[entry.desiredPeriod as keyof typeof periodLabels] || entry.desiredPeriod}
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant={statusBadgeVariant(entry.status)}>
                      {statusLabel(entry.status)}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
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

      {/* Add to Waitlist Modal */}
      <Modal open={showAddModal} onClose={handleCloseModal} title="Adicionar à Lista de Espera">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Cliente *"
            value={formData.clientId}
            onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
            required
          >
            <option value="">Selecione um cliente</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </Select>
          <Select
            label="Serviço *"
            value={formData.serviceId}
            onChange={(e) => setFormData(prev => ({ ...prev, serviceId: e.target.value }))}
            required
          >
            <option value="">Selecione um serviço</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </Select>
          <Select
            label="Profissional (opcional)"
            value={formData.professionalId}
            onChange={(e) => setFormData(prev => ({ ...prev, professionalId: e.target.value }))}
          >
            <option value="">Qualquer profissional</option>
            {professionals.map((professional) => (
              <option key={professional.id} value={professional.id}>
                {professional.name}
              </option>
            ))}
          </Select>
          <Input
            label="Data desejada *"
            type="date"
            value={formData.desiredDate}
            onChange={(e) => setFormData(prev => ({ ...prev, desiredDate: e.target.value }))}
            required
          />
          <Select
            label="Período"
            value={formData.desiredPeriod}
            onChange={(e) => setFormData(prev => ({ ...prev, desiredPeriod: e.target.value }))}
          >
            {Object.entries(periodLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
          <div className="flex gap-4 pt-4">
            <Button type="button" variant="outline" onClick={handleCloseModal} disabled={saving} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" loading={saving} className="flex-1">
              {saving ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
