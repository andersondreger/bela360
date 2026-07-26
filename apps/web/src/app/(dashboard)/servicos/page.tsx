'use client';

import { useEffect, useState } from 'react';
import { Plus, AlertCircle } from 'lucide-react';
import { ExportButton } from '@/components/ExportButton';
import { exportData, ExportFormat } from '@/lib/export';
import { Button, Input, Textarea, Modal, PageHeader, Badge } from '@/components/ui';
import { api, servicesApi, Service } from '@/lib/api';

interface Professional {
  id: string;
  name: string;
  color?: string | null;
}

interface ServiceWithProfessionals extends Service {
  professionals?: Array<{ professional: Professional }>;
}

export default function ServicosPage() {
  const [services, setServices] = useState<ServiceWithProfessionals[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceWithProfessionals | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: 60,
    price: 0,
    professionalIds: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [exporting, setExporting] = useState(false);

  const fetchServices = async (includeInactive: boolean) => {
    setLoading(true);
    setError('');
    try {
      const data = await servicesApi.list(includeInactive);
      setServices(data as ServiceWithProfessionals[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar servicos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices(showInactive);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInactive]);

  useEffect(() => {
    api
      .get<Professional[]>('/business/professionals')
      .then(setProfessionals)
      .catch(() => setProfessionals([]));
  }, []);

  const filteredServices = services;

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
          (s.professionals || []).map(p => p.professional.name).join(', '),
          s.isActive ? 'Ativo' : 'Inativo',
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

  const formatCurrency = (value: number | string) => {
    return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', duration: 60, price: 0, professionalIds: [] });
    setSelectedService(null);
    setFormError('');
  };

  const handleCloseModals = () => {
    setShowNewModal(false);
    setShowEditModal(false);
    resetForm();
  };

  const handleEdit = (service: ServiceWithProfessionals) => {
    setSelectedService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      duration: service.duration,
      price: Number(service.price),
      professionalIds: (service.professionals || []).map(p => p.professional.id),
    });
    setShowEditModal(true);
  };

  const handleProfessionalToggle = (id: string) => {
    setFormData(prev => ({
      ...prev,
      professionalIds: prev.professionalIds.includes(id)
        ? prev.professionalIds.filter(p => p !== id)
        : [...prev.professionalIds, id],
    }));
  };

  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.price <= 0) {
      setFormError('Nome e preco sao obrigatorios');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      await servicesApi.create({
        name: formData.name,
        description: formData.description || undefined,
        duration: formData.duration,
        price: formData.price,
        professionalIds: formData.professionalIds,
      });
      handleCloseModals();
      await fetchServices(showInactive);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao criar servico');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !formData.name) return;

    setSaving(true);
    setFormError('');
    try {
      await servicesApi.update(selectedService.id, {
        name: formData.name,
        description: formData.description,
        duration: formData.duration,
        price: formData.price,
        professionalIds: formData.professionalIds,
      });
      handleCloseModals();
      await fetchServices(showInactive);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar servico');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (service: ServiceWithProfessionals) => {
    try {
      await servicesApi.update(service.id, { isActive: !service.isActive });
      await fetchServices(showInactive);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar servico');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Servicos"
        description={`${services.filter(s => s.isActive).length} servicos ativos`}
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

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Services Grid */}
      {loading ? (
        <div className="px-6 py-12 text-center text-muted-foreground">Carregando servicos...</div>
      ) : filteredServices.length === 0 ? (
        <div className="px-6 py-12 text-center text-muted-foreground">Nenhum servico encontrado</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((service) => (
            <div
              key={service.id}
              className={`rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md ${
                service.isActive ? '' : 'opacity-60'
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
                  {(service.professionals || []).length === 0 && (
                    <span className="text-xs text-muted-foreground">Nenhum profissional vinculado</span>
                  )}
                  {(service.professionals || []).map((p) => (
                    <Badge key={p.professional.id} variant="default">
                      {p.professional.name}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <Badge
                  variant={service.isActive ? 'success' : 'outline'}
                  className="cursor-pointer hover:underline"
                  onClick={() => handleToggleActive(service)}
                >
                  {service.isActive ? 'Ativo' : 'Inativo'}
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
      )}

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
              {professionals.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum profissional cadastrado</p>
              )}
              {professionals.map((prof) => (
                <label key={prof.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.professionalIds.includes(prof.id)}
                    onChange={() => handleProfessionalToggle(prof.id)}
                    className="rounded border-border text-primary focus:ring-ring"
                  />
                  <span className="text-sm text-foreground">{prof.name}</span>
                </label>
              ))}
            </div>
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
              {professionals.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum profissional cadastrado</p>
              )}
              {professionals.map((prof) => (
                <label key={prof.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.professionalIds.includes(prof.id)}
                    onChange={() => handleProfessionalToggle(prof.id)}
                    className="rounded border-border text-primary focus:ring-ring"
                  />
                  <span className="text-sm text-foreground">{prof.name}</span>
                </label>
              ))}
            </div>
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
              {saving ? 'Salvando...' : 'Salvar Alteracoes'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
