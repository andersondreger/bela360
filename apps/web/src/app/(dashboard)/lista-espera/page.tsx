'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock, UserPlus, Phone, Calendar, Sun, Sunset, Moon, X, Users, CalendarCheck, Pencil } from 'lucide-react';
import { Button, Badge, PageHeader, Modal, Select, Input } from '@/components/ui';
import { api, waitlistApi, clientsApi, servicesApi, appointmentsApi, Client, Service } from '@/lib/api';

interface WaitlistEntry {
  id: string;
  client: { id: string; name: string; phone: string };
  service: { id: string; name: string };
  professional?: { id: string; name: string } | null;
  desiredDate: string;
  desiredPeriod: string;
  desiredTime?: string | null;
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
  desiredTime: '',
};

const emptyConvertForm = {
  professionalId: '',
  date: '',
  time: '',
};

const emptyEditForm = {
  serviceId: '',
  professionalId: '',
  desiredDate: '',
  desiredPeriod: 'ANY',
  desiredTime: '',
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
  const [convertingEntry, setConvertingEntry] = useState<WaitlistEntry | null>(null);
  const [convertForm, setConvertForm] = useState(emptyConvertForm);
  const [converting, setConverting] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WaitlistEntry | null>(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [savingEdit, setSavingEdit] = useState(false);

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
        desiredTime: formData.desiredTime || undefined,
      });
      await loadData();
      handleCloseModal();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao adicionar a lista de espera');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenConvert = (entry: WaitlistEntry) => {
    setConvertingEntry(entry);
    setConvertForm({
      professionalId: entry.professional?.id || '',
      date: entry.desiredDate.slice(0, 10),
      time: entry.desiredTime || '',
    });
  };

  const handleCloseConvert = () => {
    setConvertingEntry(null);
    setConvertForm(emptyConvertForm);
  };

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingEntry) return;
    if (!convertForm.professionalId || !convertForm.date || !convertForm.time) {
      alert('Profissional, data e horário são obrigatórios');
      return;
    }

    setConverting(true);
    try {
      const appointment = await appointmentsApi.create({
        clientId: convertingEntry.client.id,
        serviceId: convertingEntry.service.id,
        professionalId: convertForm.professionalId,
        startTime: new Date(`${convertForm.date}T${convertForm.time}`).toISOString(),
      });
      await waitlistApi.convert(convertingEntry.id, appointment.id);
      await loadData();
      handleCloseConvert();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao enviar para a agenda');
    } finally {
      setConverting(false);
    }
  };

  const handleOpenEdit = (entry: WaitlistEntry) => {
    setEditingEntry(entry);
    setEditForm({
      serviceId: entry.service.id,
      professionalId: entry.professional?.id || '',
      desiredDate: entry.desiredDate.slice(0, 10),
      desiredPeriod: entry.desiredPeriod,
      desiredTime: entry.desiredTime || '',
    });
  };

  const handleCloseEdit = () => {
    setEditingEntry(null);
    setEditForm(emptyEditForm);
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;
    setSavingEdit(true);
    try {
      const updated = await waitlistApi.update(editingEntry.id, {
        serviceId: editForm.serviceId,
        professionalId: editForm.professionalId || null,
        desiredDate: editForm.desiredDate,
        desiredPeriod: editForm.desiredPeriod,
        desiredTime: editForm.desiredTime || null,
      });
      setEntries(prev => prev.map(en => (en.id === editingEntry.id ? { ...en, ...(updated as WaitlistEntry) } : en)));
      handleCloseEdit();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao salvar alterações');
    } finally {
      setSavingEdit(false);
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

      {/* Waitlist Cards */}
      {entries.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
          Nenhum cliente na lista de espera
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {entries.map((entry) => {
            const PeriodIcon = periodIcons[entry.desiredPeriod as keyof typeof periodIcons] || Clock;
            return (
              <div key={entry.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{entry.client.name}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3 shrink-0" />
                      {entry.client.phone}
                    </p>
                  </div>
                  <Badge variant={statusBadgeVariant(entry.status)}>{statusLabel(entry.status)}</Badge>
                </div>

                <div className="space-y-1.5 mb-4 text-sm">
                  <p className="text-foreground font-medium">{entry.service.name}</p>
                  {entry.professional && (
                    <p className="text-muted-foreground">c/ {entry.professional.name}</p>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    {new Date(entry.desiredDate).toLocaleDateString('pt-BR')}
                  </div>
                  <div className="flex items-center gap-2">
                    {entry.desiredTime ? (
                      <Badge variant="outline" className="gap-1.5 text-sm font-semibold">
                        <Clock className="h-3.5 w-3.5" />
                        {entry.desiredTime}
                      </Badge>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <PeriodIcon className="h-3.5 w-3.5 shrink-0" />
                        {periodLabels[entry.desiredPeriod as keyof typeof periodLabels] || entry.desiredPeriod}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1 border-t border-border pt-3">
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleOpenEdit(entry)} title="Editar">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-primary"
                    onClick={() => handleOpenConvert(entry)}
                    title="Enviar para agenda"
                  >
                    <CalendarCheck className="h-4 w-4" />
                  </Button>
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
              </div>
            );
          })}
        </div>
      )}

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
          <Input
            label="Horário (opcional)"
            type="time"
            value={formData.desiredTime}
            onChange={(e) => setFormData(prev => ({ ...prev, desiredTime: e.target.value }))}
          />
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

      {/* Edit Waitlist Entry Modal */}
      <Modal open={!!editingEntry} onClose={handleCloseEdit} title="Editar Lista de Espera">
        {editingEntry && (
          <form onSubmit={handleSubmitEdit} className="space-y-4">
            <p className="text-sm text-muted-foreground">{editingEntry.client.name}</p>
            <Select
              label="Serviço *"
              value={editForm.serviceId}
              onChange={(e) => setEditForm(prev => ({ ...prev, serviceId: e.target.value }))}
              required
            >
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </Select>
            <Select
              label="Profissional (opcional)"
              value={editForm.professionalId}
              onChange={(e) => setEditForm(prev => ({ ...prev, professionalId: e.target.value }))}
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
              value={editForm.desiredDate}
              onChange={(e) => setEditForm(prev => ({ ...prev, desiredDate: e.target.value }))}
              required
            />
            <Select
              label="Período"
              value={editForm.desiredPeriod}
              onChange={(e) => setEditForm(prev => ({ ...prev, desiredPeriod: e.target.value }))}
            >
              {Object.entries(periodLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
            <Input
              label="Horário (opcional)"
              type="time"
              value={editForm.desiredTime}
              onChange={(e) => setEditForm(prev => ({ ...prev, desiredTime: e.target.value }))}
            />
            <div className="flex gap-4 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseEdit} disabled={savingEdit} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" loading={savingEdit} className="flex-1">
                {savingEdit ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Convert to Appointment Modal */}
      <Modal open={!!convertingEntry} onClose={handleCloseConvert} title="Enviar para a Agenda">
        {convertingEntry && (
          <form onSubmit={handleConvertSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {convertingEntry.client.name} — {convertingEntry.service.name}
            </p>
            <Select
              label="Profissional *"
              value={convertForm.professionalId}
              onChange={(e) => setConvertForm(prev => ({ ...prev, professionalId: e.target.value }))}
              required
            >
              <option value="">Selecione um profissional</option>
              {professionals.map((professional) => (
                <option key={professional.id} value={professional.id}>
                  {professional.name}
                </option>
              ))}
            </Select>
            <Input
              label="Data *"
              type="date"
              value={convertForm.date}
              onChange={(e) => setConvertForm(prev => ({ ...prev, date: e.target.value }))}
              required
            />
            <Input
              label="Horário *"
              type="time"
              value={convertForm.time}
              onChange={(e) => setConvertForm(prev => ({ ...prev, time: e.target.value }))}
              required
            />
            <div className="flex gap-4 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseConvert} disabled={converting} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" loading={converting} className="flex-1">
                {converting ? 'Enviando...' : 'Enviar para agenda'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
