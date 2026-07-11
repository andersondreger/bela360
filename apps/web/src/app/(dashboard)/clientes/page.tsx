'use client';

import { useState } from 'react';
import { Search, Plus, MessageCircle } from 'lucide-react';
import { ExportButton } from '@/components/ExportButton';
import { exportData, ExportFormat, prepareClientExport } from '@/lib/export';
import { Button, Input, Textarea, Modal, PageHeader } from '@/components/ui';

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  lastVisit: string;
  totalVisits: number;
  totalSpent: number;
  birthdate?: string;
  notes?: string;
}

const initialClients: Client[] = [
  { id: '1', name: 'Maria Silva', phone: '11999887766', email: 'maria@email.com', lastVisit: '2024-01-15', totalVisits: 12, totalSpent: 1240 },
  { id: '2', name: 'Joao Santos', phone: '11988776655', email: 'joao@email.com', lastVisit: '2024-01-20', totalVisits: 8, totalSpent: 640 },
  { id: '3', name: 'Carla Oliveira', phone: '11977665544', email: 'carla@email.com', lastVisit: '2024-01-18', totalVisits: 5, totalSpent: 890 },
  { id: '4', name: 'Pedro Costa', phone: '11966554433', email: 'pedro@email.com', lastVisit: '2024-01-22', totalVisits: 15, totalSpent: 1800 },
  { id: '5', name: 'Ana Souza', phone: '11955443322', email: 'ana@email.com', lastVisit: '2024-01-10', totalVisits: 3, totalSpent: 350 },
];

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>(initialClients);
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
  const [exporting, setExporting] = useState(false);

  const filteredClients = clients.filter(
    client =>
      client.name.toLowerCase().includes(search.toLowerCase()) ||
      client.phone.includes(search) ||
      client.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleExport = (format: ExportFormat) => {
    setExporting(true);
    try {
      const clientsForExport = filteredClients.map(c => ({
        name: c.name,
        phone: formatPhone(c.phone),
        email: c.email || undefined,
        lastVisitAt: c.lastVisit,
        totalAppointments: c.totalVisits,
        totalSpent: c.totalSpent,
      }));

      const data = prepareClientExport(clientsForExport);
      exportData(data, format, {
        filename: `clientes-${new Date().toISOString().split('T')[0]}`,
        title: 'Lista de Clientes',
        subtitle: `${filteredClients.length} clientes`,
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
    setFormData({ name: '', phone: '', email: '', birthdate: '', notes: '' });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitNewClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      alert('Nome e telefone sao obrigatorios');
      return;
    }

    setSaving(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    const newClient: Client = {
      id: Date.now().toString(),
      name: formData.name,
      phone: formData.phone.replace(/\D/g, ''),
      email: formData.email,
      birthdate: formData.birthdate,
      notes: formData.notes,
      lastVisit: new Date().toISOString().split('T')[0],
      totalVisits: 0,
      totalSpent: 0,
    };

    setClients(prev => [newClient, ...prev]);
    handleCloseModals();
    setSaving(false);
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
                Ultima Visita
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
            {filteredClients.map((client) => (
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
                  {formatDate(client.lastVisit)}
                </td>
                <td className="px-6 py-4 text-muted-foreground">
                  {client.totalVisits}
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
            ))}
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
                <p className="text-2xl font-bold text-primary">{selectedClient.totalVisits}</p>
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
                <span className="text-muted-foreground">Ultima Visita</span>
                <span>{formatDate(selectedClient.lastVisit)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Aniversario</span>
                <span>{selectedClient.birthdate ? formatDate(selectedClient.birthdate) : '-'}</span>
              </div>
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
              <Button className="flex-1">
                Agendar
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
