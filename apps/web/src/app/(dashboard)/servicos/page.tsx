'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { ExportButton } from '@/components/ExportButton';
import { exportData, ExportFormat } from '@/lib/export';
import { Button, Input, Textarea, Modal, PageHeader, Badge } from '@/components/ui';

interface Service {
  id: string;
  name: string;
  description?: string;
  duration: number;
  price: number;
  professionals: string[];
  active: boolean;
}

const availableProfessionals = ['Ana', 'Carlos', 'Julia'];

const initialServices: Service[] = [
  { id: '1', name: 'Corte Feminino', duration: 60, price: 80, professionals: ['Ana', 'Julia'], active: true },
  { id: '2', name: 'Corte Masculino', duration: 30, price: 45, professionals: ['Carlos'], active: true },
  { id: '3', name: 'Escova', duration: 45, price: 60, professionals: ['Ana', 'Julia'], active: true },
  { id: '4', name: 'Coloracao', duration: 120, price: 180, professionals: ['Ana'], active: true },
  { id: '5', name: 'Barba', duration: 30, price: 35, professionals: ['Carlos'], active: true },
  { id: '6', name: 'Hidratacao', duration: 60, price: 90, professionals: ['Ana', 'Julia'], active: true },
  { id: '7', name: 'Progressiva', duration: 180, price: 250, professionals: ['Ana'], active: false },
];

export default function ServicosPage() {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: 60,
    price: 0,
    professionals: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const filteredServices = services.filter(
    service => showInactive || service.active
  );

  const handleExport = (format: ExportFormat) => {
    setExporting(true);
    try {
      const data = {
        headers: ['Nome', 'Descrição', 'Duração', 'Preço', 'Profissionais', 'Status'],
        rows: filteredServices.map(s => [
          s.name,
          s.description || '-',
          formatDuration(s.duration),
          formatCurrency(s.price),
          s.professionals.join(', '),
          s.active ? 'Ativo' : 'Inativo',
        ]),
      };

      exportData(data, format, {
        filename: `servicos-${new Date().toISOString().split('T')[0]}`,
        title: 'Lista de Serviços',
        subtitle: `${filteredServices.length} serviços`,
      });
    } finally {
      setExporting(false);
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) return `${hours}h ${mins}min`;
    if (hours > 0) return `${hours}h`;
    return `${mins}min`;
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', duration: 60, price: 0, professionals: [] });
    setSelectedService(null);
  };

  const handleCloseModals = () => {
    setShowNewModal(false);
    setShowEditModal(false);
    resetForm();
  };

  const handleEdit = (service: Service) => {
    setSelectedService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      duration: service.duration,
      price: service.price,
      professionals: service.professionals,
    });
    setShowEditModal(true);
  };

  const handleProfessionalToggle = (prof: string) => {
    setFormData(prev => ({
      ...prev,
      professionals: prev.professionals.includes(prof)
        ? prev.professionals.filter(p => p !== prof)
        : [...prev.professionals, prof],
    }));
  };

  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.price <= 0) {
      alert('Nome e preco sao obrigatorios');
      return;
    }

    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    const newService: Service = {
      id: Date.now().toString(),
      name: formData.name,
      description: formData.description,
      duration: formData.duration,
      price: formData.price,
      professionals: formData.professionals,
      active: true,
    };

    setServices(prev => [...prev, newService]);
    handleCloseModals();
    setSaving(false);
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !formData.name) return;

    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    setServices(prev => prev.map(s =>
      s.id === selectedService.id
        ? { ...s, ...formData }
        : s
    ));
    handleCloseModals();
    setSaving(false);
  };

  const handleToggleActive = async (service: Service) => {
    setServices(prev => prev.map(s =>
      s.id === service.id ? { ...s, active: !s.active } : s
    ));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Servicos"
        description={`${services.filter(s => s.active).length} servicos ativos`}
        actions={
          <>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-border text-primary focus:ring-ring"
              />
              Mostrar inativos
            </label>
            <ExportButton onExport={handleExport} loading={exporting} />
            <Button onClick={() => setShowNewModal(true)}>
              <Plus className="h-4 w-4" />
              Novo Servico
            </Button>
          </>
        }
      />

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServices.map((service) => (
          <div
            key={service.id}
            className={`rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md ${
              service.active ? '' : 'opacity-60'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-foreground">{service.name}</h3>
                <p className="text-sm text-muted-foreground">{formatDuration(service.duration)}</p>
              </div>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(service.price)}
              </span>
            </div>

            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-2">Profissionais:</p>
              <div className="flex flex-wrap gap-2">
                {service.professionals.map((prof) => (
                  <Badge key={prof} variant="default">
                    {prof}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Badge
                variant={service.active ? 'success' : 'outline'}
                className="cursor-pointer hover:underline"
                onClick={() => handleToggleActive(service)}
              >
                {service.active ? 'Ativo' : 'Inativo'}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary"
                onClick={() => handleEdit(service)}
              >
                Editar
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* New Service Modal */}
      <Modal open={showNewModal} onClose={handleCloseModals} title="Novo Servico">
        <form onSubmit={handleSubmitNew} className="space-y-4">
          <Input
            label="Nome do servico *"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Ex: Corte Feminino"
            required
          />
          <Textarea
            label="Descricao (opcional)"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Descricao do servico..."
            rows={2}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Duracao (minutos)"
              type="number"
              value={formData.duration}
              onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
              min="15"
              step="15"
            />
            <Input
              label="Preco (R$) *"
              type="number"
              value={formData.price || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
              placeholder="80.00"
              min="0"
              step="0.01"
              required
            />
          </div>
          <div>
            <p className="mb-2 block text-sm font-medium text-foreground">
              Profissionais que realizam
            </p>
            <div className="space-y-2">
              {availableProfessionals.map((prof) => (
                <label key={prof} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.professionals.includes(prof)}
                    onChange={() => handleProfessionalToggle(prof)}
                    className="rounded border-border text-primary focus:ring-ring"
                  />
                  <span className="text-sm text-foreground">{prof}</span>
                </label>
              ))}
            </div>
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
              {saving ? 'Salvando...' : 'Criar Servico'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Service Modal */}
      <Modal open={showEditModal && !!selectedService} onClose={handleCloseModals} title="Editar Servico">
        <form onSubmit={handleSubmitEdit} className="space-y-4">
          <Input
            label="Nome do servico *"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
          />
          <Textarea
            label="Descricao"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={2}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Duracao (minutos)"
              type="number"
              value={formData.duration}
              onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
              min="15"
              step="15"
            />
            <Input
              label="Preco (R$) *"
              type="number"
              value={formData.price}
              onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
              min="0"
              step="0.01"
              required
            />
          </div>
          <div>
            <p className="mb-2 block text-sm font-medium text-foreground">
              Profissionais que realizam
            </p>
            <div className="space-y-2">
              {availableProfessionals.map((prof) => (
                <label key={prof} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.professionals.includes(prof)}
                    onChange={() => handleProfessionalToggle(prof)}
                    className="rounded border-border text-primary focus:ring-ring"
                  />
                  <span className="text-sm text-foreground">{prof}</span>
                </label>
              ))}
            </div>
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
              {saving ? 'Salvando...' : 'Salvar Alteracoes'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
