'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Star,
  Plus,
  Crown,
  UserPlus,
  Clock,
  Gift,
  TrendingUp,
} from 'lucide-react';
import {
  PageHeader,
  Button,
  Badge,
  Modal,
  Input,
  Select,
  Textarea,
} from '@/components/ui';

interface Campaign {
  id: string;
  name: string;
  status: string;
  segmentType: string;
  totalRecipients: number;
  sentCount: number;
  createdAt: string;
}

interface SegmentOverview {
  all: number;
  new: number;
  loyal: number;
  inactive: number;
  vip: number;
  birthdayMonth: number;
}

const segmentInfo = {
  ALL: { name: 'Todos', icon: Users, color: 'bg-gray-100 text-gray-600' },
  VIP: { name: 'VIP', icon: Crown, color: 'bg-yellow-100 text-yellow-600' },
  NEW: { name: 'Novos', icon: UserPlus, color: 'bg-green-100 text-green-600' },
  LOYAL: { name: 'Fiéis', icon: Star, color: 'bg-purple-100 text-purple-600' },
  INACTIVE: { name: 'Inativos', icon: Clock, color: 'bg-red-100 text-red-600' },
  BIRTHDAY_MONTH: { name: 'Aniversariantes', icon: Gift, color: 'bg-pink-100 text-pink-600' },
};

const statusLabels: Record<
  string,
  { label: string; variant: 'outline' | 'info' | 'warning' | 'success' }
> = {
  DRAFT: { label: 'Rascunho', variant: 'outline' },
  SCHEDULED: { label: 'Agendada', variant: 'info' },
  SENDING: { label: 'Enviando', variant: 'warning' },
  COMPLETED: { label: 'Concluída', variant: 'success' },
};

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [segments, setSegments] = useState<SegmentOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [ratingStats, setRatingStats] = useState({ average: 4.7, total: 156 });
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    message: '',
    segmentType: 'ALL',
    scheduledDate: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Simulated data - replace with API call
    setCampaigns([
      {
        id: '1',
        name: 'Promoção de Janeiro',
        status: 'COMPLETED',
        segmentType: 'ALL',
        totalRecipients: 250,
        sentCount: 248,
        createdAt: '2026-01-02',
      },
      {
        id: '2',
        name: 'Reativação Clientes Inativos',
        status: 'SENDING',
        segmentType: 'INACTIVE',
        totalRecipients: 45,
        sentCount: 23,
        createdAt: '2026-01-04',
      },
      {
        id: '3',
        name: 'Aniversariantes do Mês',
        status: 'SCHEDULED',
        segmentType: 'BIRTHDAY_MONTH',
        totalRecipients: 12,
        sentCount: 0,
        createdAt: '2026-01-05',
      },
    ]);
    setSegments({
      all: 450,
      new: 32,
      loyal: 87,
      inactive: 45,
      vip: 23,
      birthdayMonth: 12,
    });
    setLoading(false);
  }, []);

  const handleCloseModal = () => {
    setShowNewCampaign(false);
    setFormData({ name: '', message: '', segmentType: 'ALL', scheduledDate: '' });
  };

  const getRecipientCount = (segmentType: string): number => {
    if (!segments) return 0;
    const segmentMap: Record<string, keyof SegmentOverview> = {
      ALL: 'all',
      NEW: 'new',
      LOYAL: 'loyal',
      INACTIVE: 'inactive',
      VIP: 'vip',
      BIRTHDAY_MONTH: 'birthdayMonth',
    };
    return segments[segmentMap[segmentType]] || 0;
  };

  const handleSubmitCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.message) {
      alert('Nome e mensagem sao obrigatorios');
      return;
    }

    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    const newCampaign: Campaign = {
      id: Date.now().toString(),
      name: formData.name,
      status: formData.scheduledDate ? 'SCHEDULED' : 'SENDING',
      segmentType: formData.segmentType,
      totalRecipients: getRecipientCount(formData.segmentType),
      sentCount: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };

    setCampaigns(prev => [newCampaign, ...prev]);
    handleCloseModal();
    setSaving(false);
    alert(formData.scheduledDate ? 'Campanha agendada com sucesso!' : 'Campanha iniciada!');
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
        title="Marketing"
        description="Campanhas, segmentação de clientes e avaliações"
        actions={
          <Button onClick={() => setShowNewCampaign(true)}>
            <Plus className="h-4 w-4" />
            Nova Campanha
          </Button>
        }
      />

      {/* Rating Stats */}
      <div className="noise-overlay rounded-2xl bg-gradient-to-r from-bela-gold via-amber-500 to-orange-500 p-6 text-white shadow-glow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80">Avaliação Média</p>
            <div className="flex items-center gap-2 mt-1">
              <Star className="h-8 w-8 fill-white" />
              <span className="text-4xl font-bold">{ratingStats.average}</span>
              <span className="text-white/80">/ 5.0</span>
            </div>
            <p className="text-sm text-white/80 mt-1">
              Baseado em {ratingStats.total} avaliações
            </p>
          </div>
          <div className="text-right">
            <TrendingUp className="h-12 w-12 text-white/30" />
          </div>
        </div>
      </div>

      {/* Segments */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Segmentos de Clientes</h2>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {Object.entries(segmentInfo).map(([key, info]) => {
            const Icon = info.icon;
            const count = segments?.[key.toLowerCase() as keyof SegmentOverview] ||
                         (key === 'BIRTHDAY_MONTH' ? segments?.birthdayMonth : 0);

            return (
              <div
                key={key}
                className="rounded-2xl border border-border bg-card p-4 text-center shadow-sm transition-shadow hover:shadow-md"
              >
                <div className={`inline-flex p-3 rounded-xl ${info.color} mb-2`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-sm text-muted-foreground">{info.name}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Campaigns */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Campanhas Recentes</h2>
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-medium">Campanha</th>
                <th className="text-left p-4 font-medium">Segmento</th>
                <th className="text-left p-4 font-medium">Destinatários</th>
                <th className="text-left p-4 font-medium">Progresso</th>
                <th className="text-left p-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => {
                const segment = segmentInfo[campaign.segmentType as keyof typeof segmentInfo];
                const SegmentIcon = segment?.icon || Users;
                const status = statusLabels[campaign.status];
                const progress = campaign.totalRecipients > 0
                  ? (campaign.sentCount / campaign.totalRecipients) * 100
                  : 0;

                return (
                  <tr key={campaign.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-4">
                      <p className="font-medium">{campaign.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(campaign.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className={`p-1 rounded ${segment?.color}`}>
                          <SegmentIcon className="h-4 w-4" />
                        </div>
                        <span className="text-sm">{segment?.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm">
                        {campaign.sentCount} / {campaign.totalRecipients}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="w-24">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {progress.toFixed(0)}%
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant={status?.variant || 'outline'}>{status?.label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {campaigns.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              Nenhuma campanha criada ainda
            </div>
          )}
        </div>
      </div>

      {/* New Campaign Modal */}
      <Modal open={showNewCampaign} onClose={handleCloseModal} title="Nova Campanha">
        <form onSubmit={handleSubmitCampaign} className="space-y-4">
          <Input
            label="Nome da campanha *"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Ex: Promocao de Verao"
            required
          />
          <Select
            label="Segmento de clientes"
            value={formData.segmentType}
            onChange={(e) => setFormData(prev => ({ ...prev, segmentType: e.target.value }))}
          >
            {Object.entries(segmentInfo).map(([key, info]) => (
              <option key={key} value={key}>
                {info.name} ({getRecipientCount(key)} clientes)
              </option>
            ))}
          </Select>
          <div>
            <Textarea
              label="Mensagem *"
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Digite a mensagem que sera enviada aos clientes..."
              rows={4}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use {'{nome}'} para personalizar com o nome do cliente
            </p>
          </div>
          <div>
            <Input
              label="Agendar envio (opcional)"
              type="datetime-local"
              value={formData.scheduledDate}
              onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Deixe vazio para enviar imediatamente
            </p>
          </div>
          <div className="p-4 bg-muted/50 rounded-xl">
            <p className="text-sm font-medium">Resumo da campanha:</p>
            <p className="text-sm text-muted-foreground mt-1">
              Sera enviada para <span className="font-bold">{getRecipientCount(formData.segmentType)}</span> clientes
              do segmento <span className="font-bold">{segmentInfo[formData.segmentType as keyof typeof segmentInfo]?.name}</span>
            </p>
          </div>
          <div className="flex gap-4 pt-4">
            <Button type="button" variant="outline" onClick={handleCloseModal} disabled={saving} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" loading={saving} className="flex-1">
              {saving ? 'Criando...' : formData.scheduledDate ? 'Agendar Campanha' : 'Enviar Agora'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
