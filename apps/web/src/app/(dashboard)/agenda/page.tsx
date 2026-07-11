'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button, Input, Select, Modal, PageHeader } from '@/components/ui';

interface Appointment {
  id: string;
  clientName: string;
  service: string;
  professionalId: string;
  time: string;
  date: string;
  duration: number;
  status: 'pending' | 'confirmed' | 'cancelled';
}

const professionals = [
  { id: '1', name: 'Ana', color: '#7C3AED' },
  { id: '2', name: 'Carlos', color: '#EC4899' },
  { id: '3', name: 'Julia', color: '#10B981' },
];

const services = [
  { name: 'Corte Feminino', duration: 60 },
  { name: 'Corte Masculino', duration: 30 },
  { name: 'Escova', duration: 45 },
  { name: 'Coloracao', duration: 120 },
  { name: 'Barba', duration: 30 },
];

const timeSlots = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00',
];

const initialAppointments: Appointment[] = [
  { id: '1', clientName: 'Maria Silva', service: 'Corte + Escova', professionalId: '1', time: '09:00', date: new Date().toISOString().split('T')[0], duration: 60, status: 'confirmed' },
  { id: '2', clientName: 'Joao Santos', service: 'Barba', professionalId: '2', time: '09:30', date: new Date().toISOString().split('T')[0], duration: 30, status: 'confirmed' },
  { id: '3', clientName: 'Carla Oliveira', service: 'Coloracao', professionalId: '1', time: '10:30', date: new Date().toISOString().split('T')[0], duration: 120, status: 'pending' },
  { id: '4', clientName: 'Pedro Costa', service: 'Corte Masculino', professionalId: '2', time: '11:00', date: new Date().toISOString().split('T')[0], duration: 30, status: 'confirmed' },
];

function statusPillClasses(status: Appointment['status']) {
  switch (status) {
    case 'confirmed':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400';
    case 'cancelled':
      return 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400';
    default:
      return 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400';
  }
}

export default function AgendaPage() {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ professionalId: string; time: string } | null>(null);
  const [formData, setFormData] = useState({
    clientName: '',
    service: '',
    professionalId: '',
    date: selectedDate,
    time: '09:00',
  });
  const [saving, setSaving] = useState(false);

  const getAppointmentForSlot = (professionalId: string, time: string) => {
    return appointments.find(
      apt => apt.professionalId === professionalId && apt.time === time && apt.date === selectedDate
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
    setSelectedSlot(null);
    setFormData({ clientName: '', service: '', professionalId: '', date: selectedDate, time: '09:00' });
  };

  const handleSlotClick = (professionalId: string, time: string) => {
    const existing = getAppointmentForSlot(professionalId, time);
    if (existing) {
      setSelectedAppointment(existing);
      setShowDetailsModal(true);
    } else {
      setSelectedSlot({ professionalId, time });
      setFormData(prev => ({ ...prev, professionalId, time, date: selectedDate }));
      setShowNewModal(true);
    }
  };

  const handleSubmitAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientName || !formData.service || !formData.professionalId) {
      alert('Preencha todos os campos obrigatorios');
      return;
    }

    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    const service = services.find(s => s.name === formData.service);
    const newAppointment: Appointment = {
      id: Date.now().toString(),
      clientName: formData.clientName,
      service: formData.service,
      professionalId: formData.professionalId,
      date: formData.date,
      time: formData.time,
      duration: service?.duration || 60,
      status: 'pending',
    };

    setAppointments(prev => [...prev, newAppointment]);
    handleCloseModals();
    setSaving(false);
  };

  const handleConfirmAppointment = () => {
    if (!selectedAppointment) return;
    setAppointments(prev => prev.map(apt =>
      apt.id === selectedAppointment.id ? { ...apt, status: 'confirmed' } : apt
    ));
    handleCloseModals();
  };

  const handleCancelAppointment = () => {
    if (!selectedAppointment) return;
    if (confirm('Deseja realmente cancelar este agendamento?')) {
      setAppointments(prev => prev.filter(apt => apt.id !== selectedAppointment.id));
      handleCloseModals();
    }
  };

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

      {/* Calendar Grid */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[80px_repeat(3,1fr)] border-b border-border">
          <div className="p-4 bg-muted" />
          {professionals.map((prof) => (
            <div
              key={prof.id}
              className="p-4 text-center font-medium border-l border-border"
              style={{ backgroundColor: `${prof.color}10` }}
            >
              <div
                className="w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center text-white text-sm font-bold"
                style={{ backgroundColor: prof.color }}
              >
                {prof.name[0]}
              </div>
              {prof.name}
            </div>
          ))}
        </div>

        {/* Time Slots */}
        <div className="max-h-[600px] overflow-y-auto">
          {timeSlots.map((time) => (
            <div key={time} className="grid grid-cols-[80px_repeat(3,1fr)] border-b border-border/60">
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
                        <p className="font-medium truncate">{appointment.clientName}</p>
                        <p className="truncate">{appointment.service}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-emerald-100 dark:bg-emerald-500/15 rounded" />
          <span className="text-muted-foreground">Confirmado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-amber-100 dark:bg-amber-500/15 rounded" />
          <span className="text-muted-foreground">Pendente</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-100 dark:bg-red-500/15 rounded" />
          <span className="text-muted-foreground">Cancelado</span>
        </div>
      </div>

      {/* New Appointment Modal */}
      <Modal open={showNewModal} onClose={handleCloseModals} title="Novo Agendamento">
        <form onSubmit={handleSubmitAppointment} className="space-y-4">
          <Input
            label="Cliente *"
            type="text"
            value={formData.clientName}
            onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
            placeholder="Nome do cliente..."
            required
          />
          <Select
            label="Servico *"
            value={formData.service}
            onChange={(e) => setFormData(prev => ({ ...prev, service: e.target.value }))}
            required
          >
            <option value="">Selecione um servico</option>
            {services.map((s) => (
              <option key={s.name} value={s.name}>{s.name} ({s.duration}min)</option>
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
                <span className="font-medium">{selectedAppointment.clientName}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Servico</span>
                <span>{selectedAppointment.service}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Profissional</span>
                <span>{professionals.find(p => p.id === selectedAppointment.professionalId)?.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Horario</span>
                <span>{selectedAppointment.time} ({selectedAppointment.duration}min)</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Status</span>
                <span className={`px-2 py-1 rounded-full text-sm ${statusPillClasses(selectedAppointment.status)}`}>
                  {selectedAppointment.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                </span>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="destructive" onClick={handleCancelAppointment} className="flex-1">
                <X className="h-4 w-4" />
                Cancelar
              </Button>
              {selectedAppointment.status !== 'confirmed' && (
                <Button onClick={handleConfirmAppointment} className="flex-1">
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
