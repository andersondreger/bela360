'use client';

import { useEffect, useState } from 'react';
import { Plus, X, AlertCircle } from 'lucide-react';
import { Button, Input, Select, Modal, PageHeader } from '@/components/ui';
import { appointmentsApi, servicesApi, clientsApi, api, Appointment, AppointmentStatus, Service, Client } from '@/lib/api';

interface Professional {
  id: string;
  name: string;
  color?: string | null;
}

const FALLBACK_COLORS = ['#7C3AED', '#EC4899', '#10B981', '#F0B429', '#06b6d4', '#F0439C'];

const timeSlots = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00',
];

function statusPillClasses(status: AppointmentStatus) {
  switch (status) {
    case 'CONFIRMED':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400';
    case 'CANCELLED':
      return 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400';
    case 'COMPLETED':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-400';
    case 'NO_SHOW':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400';
    default:
      return 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400';
  }
}

function statusLabel(status: AppointmentStatus) {
  switch (status) {
    case 'CONFIRMED': return 'Confirmado';
    case 'CANCELLED': return 'Cancelado';
    case 'COMPLETED': return 'Concluído';
    case 'NO_SHOW': return 'Não compareceu';
    default: return 'Pendente';
  }
}

function formatSlotTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function AgendaPage() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [loadingResources, setLoadingResources] = useState(true);
  const [error, setError] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [formData, setFormData] = useState({
    clientId: '',
    serviceId: '',
    professionalId: '',
    date: selectedDate,
    time: '09:00',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [actionSaving, setActionSaving] = useState(false);

  useEffect(() => {
    setLoadingResources(true);
    Promise.all([
      api.get<Professional[]>('/business/professionals').catch(() => []),
      servicesApi.list().catch(() => []),
      clientsApi.list({ limit: 100 }).catch(() => []),
    ])
      .then(([profs, servs, cls]) => {
        setProfessionals(profs);
        setServices(servs);
        setClients(cls);
      })
      .finally(() => setLoadingResources(false));
  }, []);

  const fetchAppointments = async (dateStr: string) => {
    setLoadingAppointments(true);
    setError('');
    try {
      const startDate = new Date(`${dateStr}T00:00:00`).toISOString();
      const endDate = new Date(`${dateStr}T23:59:59.999`).toISOString();
      const data = await appointmentsApi.list({ startDate, endDate });
      setAppointments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar agendamentos');
    } finally {
      setLoadingAppointments(false);
    }
  };

  useEffect(() => {
    fetchAppointments(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const getAppointmentForSlot = (professionalId: string, time: string) => {
    return appointments.find(
      apt => apt.professionalId === professionalId && formatSlotTime(apt.startTime) === time
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const handleCloseModals = () => {
    setShowNewModal(false);
    setShowDetailsModal(false);
    setSelectedAppointment(null);
    setFormError('');
    setFormData({ clientId: '', serviceId: '', professionalId: '', date: selectedDate, time: '09:00' });
  };

  const handleSlotClick = (professionalId: string, time: string) => {
    const existing = getAppointmentForSlot(professionalId, time);
    if (existing) {
      setSelectedAppointment(existing);
      setShowDetailsModal(true);
    } else {
      setFormData(prev => ({ ...prev, professionalId, time, date: selectedDate }));
      setShowNewModal(true);
    }
  };

  const handleSubmitAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId || !formData.serviceId || !formData.professionalId) {
      setFormError('Preencha todos os campos obrigatorios');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const startTime = new Date(`${formData.date}T${formData.time}:00`).toISOString();
      await appointmentsApi.create({
        clientId: formData.clientId,
        professionalId: formData.professionalId,
        serviceId: formData.serviceId,
        startTime,
      });
      handleCloseModals();
      await fetchAppointments(selectedDate);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao criar agendamento');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmAppointment = async () => {
    if (!selectedAppointment) return;
    setActionSaving(true);
    try {
      await appointmentsApi.confirm(selectedAppointment.id);
      handleCloseModals();
      await fetchAppointments(selectedDate);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao confirmar agendamento');
    } finally {
      setActionSaving(false);
    }
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return;
    if (!confirm('Deseja realmente cancelar este agendamento?')) return;
    setActionSaving(true);
    try {
      await appointmentsApi.cancel(selectedAppointment.id);
      handleCloseModals();
      await fetchAppointments(selectedDate);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cancelar agendamento');
    } finally {
      setActionSaving(false);
    }
  };

  const gridColumns = { gridTemplateColumns: `80px repeat(${professionals.length || 1}, 1fr)` };
  const loading = loadingResources || loadingAppointments;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agenda"
        description={formatDate(selectedDate)}
        className="[&_p]:capitalize"
        actions={
          <>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
            />
            <Button onClick={() => setShowNewModal(true)}>
              <Plus className="h-4 w-4" />
              Novo Agendamento
            </Button>
          </>
        }
      />

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {professionals.length === 0 && !loadingResources ? (
          <div className="px-6 py-12 text-center text-muted-foreground">
            Nenhum profissional cadastrado ainda
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="grid border-b border-border" style={gridColumns}>
              <div className="p-4 bg-muted" />
              {professionals.map((prof, i) => (
                <div
                  key={prof.id}
                  className="p-4 text-center font-medium border-l border-border"
                  style={{ backgroundColor: `${prof.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length]}10` }}
                >
                  <div
                    className="w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: prof.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length] }}
                  >
                    {prof.name[0]}
                  </div>
                  {prof.name}
                </div>
              ))}
            </div>

            {/* Time Slots */}
            <div className="max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="px-6 py-12 text-center text-muted-foreground">Carregando agenda...</div>
              ) : (
                timeSlots.map((time) => (
                  <div key={time} className="grid border-b border-border/60" style={gridColumns}>
                    <div className="p-2 text-sm text-muted-foreground text-right pr-4 bg-muted">
                      {time}
                    </div>
                    {professionals.map((prof) => {
                      const appointment = getAppointmentForSlot(prof.id, time);
                      return (
                        <div
                          key={`${prof.id}-${time}`}
                          onClick={() => handleSlotClick(prof.id, time)}
                          className="p-1 min-h-[50px] border-l border-border/60 hover:bg-muted cursor-pointer transition-colors"
                        >
                          {appointment && (
                            <div className={`p-2 rounded-lg text-xs ${statusPillClasses(appointment.status)}`}>
                              <p className="font-medium truncate">{appointment.client?.name || 'Cliente'}</p>
                              <p className="truncate">{appointment.service?.name || 'Serviço'}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-emerald-100 dark:bg-emerald-500/15 rounded" />
          <span className="text-muted-foreground">Confirmado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-amber-100 dark:bg-amber-500/15 rounded" />
          <span className="text-muted-foreground">Pendente</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-100 dark:bg-gray-500/15 rounded" />
          <span className="text-muted-foreground">Concluído</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-100 dark:bg-red-500/15 rounded" />
          <span className="text-muted-foreground">Cancelado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-100 dark:bg-orange-500/15 rounded" />
          <span className="text-muted-foreground">Não compareceu</span>
        </div>
      </div>

      {/* New Appointment Modal */}
      <Modal open={showNewModal} onClose={handleCloseModals} title="Novo Agendamento">
        <form onSubmit={handleSubmitAppointment} className="space-y-4">
          <Select
            label="Cliente *"
            value={formData.clientId}
            onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
            required
          >
            <option value="">Selecione um cliente</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <Select
            label="Servico *"
            value={formData.serviceId}
            onChange={(e) => setFormData(prev => ({ ...prev, serviceId: e.target.value }))}
            required
          >
            <option value="">Selecione um servico</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.duration}min)</option>
            ))}
          </Select>
          <Select
            label="Profissional *"
            value={formData.professionalId}
            onChange={(e) => setFormData(prev => ({ ...prev, professionalId: e.target.value }))}
            required
          >
            <option value="">Selecione um profissional</option>
            {professionals.map((prof) => (
              <option key={prof.id} value={prof.id}>{prof.name}</option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Data"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            />
            <Select
              label="Horario"
              value={formData.time}
              onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
            >
              {timeSlots.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseModals}
              disabled={saving}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" loading={saving} className="flex-1">
              {saving ? 'Salvando...' : 'Agendar'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Appointment Details Modal */}
      <Modal open={showDetailsModal && !!selectedAppointment} onClose={handleCloseModals} title="Detalhes do Agendamento">
        {selectedAppointment && (
          <>
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Cliente</span>
                <span className="font-medium">{selectedAppointment.client?.name || 'Cliente'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Servico</span>
                <span>{selectedAppointment.service?.name || 'Serviço'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Profissional</span>
                <span>{selectedAppointment.professional?.name || professionals.find(p => p.id === selectedAppointment.professionalId)?.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Horario</span>
                <span>{formatSlotTime(selectedAppointment.startTime)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Status</span>
                <span className={`px-2 py-1 rounded-full text-sm ${statusPillClasses(selectedAppointment.status)}`}>
                  {statusLabel(selectedAppointment.status)}
                </span>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              {selectedAppointment.status !== 'CANCELLED' && selectedAppointment.status !== 'COMPLETED' && (
                <Button variant="destructive" onClick={handleCancelAppointment} loading={actionSaving} className="flex-1">
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
              )}
              {selectedAppointment.status === 'PENDING' && (
                <Button onClick={handleConfirmAppointment} loading={actionSaving} className="flex-1">
                  Confirmar
                </Button>
              )}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
