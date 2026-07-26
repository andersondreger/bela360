'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { marketingApi, isPremiumLockedError } from '@/lib/api';

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

interface RatingStatsResponse {
  averageRating: number;
  totalRatings: number;
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
  { label: string; variant: 'outline' | 'info' | 'warning' | 'success' | 'destructive' }
> = {
  DRAFT: { label: 'Rascunho', variant: 'outline' },
  SCHEDULED: { label: 'Agendada', variant: 'info' },
  SENDING: { label: 'Enviando', variant: 'warning' },
  COMPLETED: { label: 'Concluída', variant: 'success' },
  CANCELLED: { label: 'Cancelada', variant: 'destructive' },
};

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [segments, setSegments] = useState<SegmentOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState('');
  const [ratingStats, setRatingStats] = useState({ average: 0, total: 0 });
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    message: '',
    segmentType: 'ALL',
    scheduledDate: '',
  });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    setLocked(false);
    try {
      const [campaignsData, segmentsData, ratingData] = await Promise.all([
        marketingApi.listCampaigns(),
        marketingApi.getSegments(),
        marketingApi.getRatingStats() as Promise<RatingStatsResponse>,
      ]);
      setCampaigns(campaignsData);
      setSegments(segmentsData);
      setRatingStats({
        average: ratingData?.averageRating || 0,
        total: ratingData?.totalRatings || 0,
      });
    } catch (err) {
      if (isPremiumLockedError(err)) {
        setLocked(true);
      } else {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados de marketing');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    try {
      const payload: Record<string, unknown> = {
        name: formData.name,
        message: formData.message,
        segmentType: formData.segmentType,
      };
      if (formData.scheduledDate) {
        payload.scheduledFor = new Date(formData.scheduledDate).toISOString();
      }

      const campaign = await marketingApi.createCampaign(payload);
      if (!formData.scheduledDate) {
        await marketingApi.startCampaign(campaign.id);
      }

      await loadData();
      handleCloseModal();
      alert(formData.scheduledDate ? 'Campanha agendada com sucesso!' : 'Campanha iniciada!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao criar campanha');
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

  if (locked) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Marketing"
          description="Campanhas, segmentação de clientes e avaliações"
        />
        <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-bela-gold via-amber-500 to-orange-500 text-white">
            <Crown className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-semibold">Este é um recurso premium</h2>
          <p className="mt-2 max-w-md mx-auto text-muted-foreground">
            Este recurso faz parte do plano premium do bela360. Peça um cupom de desbloqueio em{' '}
            <a href="/configuracoes" className="font-medium text-primary hover:underline">
              Configurações &gt; Plano
            </a>
            .
          </p>
        </div>
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

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Rating Stats */}
      <div className="noise-overlay rounded-2xl bg-gradient-to-r from-bela-gold via-amber-500 to-orange-500 p-6 text-white shadow-glow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80">Avaliação Média</p>
            <div className="flex items-center gap-2 mt-1">
              <Star className="h-8 w-8 fill-white" />
              <span className="text-4xl font-bold">{ratingStats.average.toFixed(1)}</span>
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
                        <span className="text-sm">{segment?.name || campaign.segmentType}</span>
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
                      <Badge variant={status?.variant || 'outline'}>{status?.label || campaign.status}</Badge>
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
