'use client';

import { useEffect, useState } from 'react';
import { Search, Plus, MessageCircle, AlertCircle } from 'lucide-react';
import { ExportButton } from '@/components/ExportButton';
import { exportData, ExportFormat, prepareClientExport } from '@/lib/export';
import { Button, Input, Textarea, Modal, PageHeader } from '@/components/ui';
import { clientsApi, Client } from '@/lib/api';

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    birthdate: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [exporting, setExporting] = useState(false);

  const fetchClients = async (searchTerm: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await clientsApi.list({ search: searchTerm || undefined, limit: 100 });
      setClients(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => fetchClients(search), search ? 300 : 0);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleExport = (format: ExportFormat) => {
    setExporting(true);
    try {
      const clientsForExport = clients.map(c => ({
        name: c.name,
        phone: formatPhone(c.phone),
        email: c.email || undefined,
        lastVisitAt: c.createdAt,
        totalAppointments: c.totalAppointments,
        totalSpent: c.totalSpent,
      }));

      const data = prepareClientExport(clientsForExport);
      exportData(data, format, {
        filename: `clientes-${new Date().toISOString().split('T')[0]}`,
        title: 'Lista de Clientes',
        subtitle: `${clients.length} clientes`,
      });
    } finally {
      setExporting(false);
    }
  };

  const handleOpenProfile = (client: Client) => {
    setSelectedClient(client);
    setShowProfileModal(true);
  };

  const handleCloseModals = () => {
    setShowNewModal(false);
    setShowProfileModal(false);
    setSelectedClient(null);
    setFormError('');
    setFormData({ name: '', phone: '', email: '', birthdate: '', notes: '' });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitNewClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      setFormError('Nome e telefone sao obrigatorios');
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      await clientsApi.create({
        name: formData.name,
        phone: formData.phone.replace(/\D/g, ''),
        email: formData.email || undefined,
        birthDate: formData.birthdate || undefined,
        notes: formData.notes || undefined,
      });
      handleCloseModals();
      await fetchClients(search);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao cadastrar cliente');
    } finally {
      setSaving(false);
    }
  };

  const formatPhone = (phone: string) => {
    return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description={`${clients.length} clientes cadastrados`}
        actions={
          <>
            <ExportButton onExport={handleExport} loading={exporting} />
            <Button onClick={() => setShowNewModal(true)}>
              <Plus className="h-4 w-4" />
              Novo Cliente
            </Button>
          </>
        }
      />

      {/* Search */}
      <div className="relative">
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, telefone ou email..."
          className="pl-10"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Clients Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Cliente
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Telefone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Cliente Desde
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Visitas
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Gasto
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Acoes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                  Carregando clientes...
                </td>
              </tr>
            ) : clients.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                  Nenhum cliente encontrado
                </td>
              </tr>
            ) : (
              clients.map((client) => (
                <tr key={client.id} className="hover:bg-muted/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-brand rounded-full flex items-center justify-center text-white font-medium">
                        {client.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{client.name}</p>
                        <p className="text-sm text-muted-foreground">{client.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {formatPhone(client.phone)}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {formatDate(client.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {client.totalAppointments}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {formatCurrency(client.totalSpent)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary hover:text-primary"
                      onClick={() => handleOpenProfile(client)}
                    >
                      Ver perfil
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* New Client Modal */}
      <Modal open={showNewModal} onClose={handleCloseModals} title="Novo Cliente">
        <form onSubmit={handleSubmitNewClient} className="space-y-4">
          <Input
            label="Nome completo *"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Nome do cliente"
            required
          />
          <Input
            label="Telefone *"
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            placeholder="(11) 99999-9999"
            required
          />
          <Input
            label="Email (opcional)"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="email@exemplo.com"
          />
          <Input
            label="Data de Nascimento (opcional)"
            type="date"
            name="birthdate"
            value={formData.birthdate}
            onChange={handleInputChange}
          />
          <Textarea
            label="Observacoes"
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            placeholder="Observacoes sobre o cliente..."
            rows={3}
          />
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
              {saving ? 'Salvando...' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Client Profile Modal */}
      <Modal open={showProfileModal && !!selectedClient} onClose={handleCloseModals} title={selectedClient?.name}>
        {selectedClient && (
          <>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-brand rounded-full flex items-center justify-center text-white text-xl font-bold">
                {selectedClient.name.split(' ').map(n => n[0]).join('')}
              </div>
              <p className="text-muted-foreground">{formatPhone(selectedClient.phone)}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-muted rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-primary">{selectedClient.totalAppointments}</p>
                <p className="text-sm text-muted-foreground">Visitas</p>
              </div>
              <div className="bg-muted rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(selectedClient.totalSpent)}</p>
                <p className="text-sm text-muted-foreground">Total Gasto</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Email</span>
                <span>{selectedClient.email || '-'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Cliente Desde</span>
                <span>{formatDate(selectedClient.createdAt)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Aniversario</span>
                <span>{selectedClient.birthDate ? formatDate(selectedClient.birthDate) : '-'}</span>
              </div>
              {selectedClient.notes && (
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Observacoes</span>
                  <span className="text-right">{selectedClient.notes}</span>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <Button
                variant="outline"
                className="flex-1 border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                onClick={() => window.open(`https://wa.me/55${selectedClient.phone}`, '_blank')}
              >
                <MessageCircle className="w-5 h-5" />
                WhatsApp
              </Button>
              <Button className="flex-1" onClick={() => { window.location.href = '/agenda'; }}>
                Agendar
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
