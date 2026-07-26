'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Gift,
  Star,
  Users,
  TrendingUp,
  Award,
  Plus,
  Crown,
  Target,
} from 'lucide-react';
import { Button, Card, CardContent, Badge, Modal, Input, Textarea, Select, PageHeader } from '@/components/ui';
import { loyaltyApi, isPremiumLockedError } from '@/lib/api';

interface LoyaltyStats {
  totalClients: number;
  totalPointsActive: number;
  totalPointsRedeemed: number;
  tierDistribution: {
    BRONZE: number;
    SILVER: number;
    GOLD: number;
    DIAMOND: number;
  };
}

interface LoyaltyProgramData {
  pointsPerReal: number | string;
  silverThreshold: number;
  goldThreshold: number;
  diamondThreshold: number;
}

interface Reward {
  id: string;
  name: string;
  description?: string | null;
  pointsCost: number;
  type: string;
  totalRedemptions: number;
}

interface Redemption {
  id: string;
  couponCode: string;
  pointsUsed: number;
  createdAt: string;
  reward: { name: string };
  client: { name: string };
}

interface LoyaltyStatsResponse {
  program: LoyaltyProgramData | null;
  stats: {
    totalClients: number;
    totalPointsActive: number;
    totalPointsEarned: number;
    totalPointsRedeemed: number;
  };
  tierDistribution: Partial<Record<'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND', number>>;
  recentRedemptions: Redemption[];
}

export default function FidelidadePage() {
  const [stats, setStats] = useState<LoyaltyStats | null>(null);
  const [program, setProgram] = useState<LoyaltyProgramData | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [recentRedemptions, setRecentRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState('');
  const [showNewReward, setShowNewReward] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    pointsCost: 100,
    type: 'DISCOUNT_PERCENT',
    discountValue: 10,
  });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLocked(false);
    setError('');
    try {
      const [statsResp, rewardsList] = await Promise.all([
        loyaltyApi.getStats() as Promise<LoyaltyStatsResponse>,
        loyaltyApi.listRewards() as Promise<Reward[]>,
      ]);

      setStats({
        totalClients: statsResp.stats.totalClients,
        totalPointsActive: statsResp.stats.totalPointsActive,
        totalPointsRedeemed: statsResp.stats.totalPointsRedeemed,
        tierDistribution: {
          BRONZE: statsResp.tierDistribution.BRONZE || 0,
          SILVER: statsResp.tierDistribution.SILVER || 0,
          GOLD: statsResp.tierDistribution.GOLD || 0,
          DIAMOND: statsResp.tierDistribution.DIAMOND || 0,
        },
      });
      setProgram(statsResp.program);
      setRecentRedemptions(statsResp.recentRedemptions || []);
      setRewards(rewardsList || []);
    } catch (err) {
      if (isPremiumLockedError(err)) {
        setLocked(true);
      } else {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados de fidelidade.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const tierColors = {
    BRONZE: 'text-amber-700 bg-amber-100',
    SILVER: 'text-muted-foreground bg-muted',
    GOLD: 'text-yellow-600 bg-yellow-100',
    DIAMOND: 'text-bela-purple bg-bela-purple/10',
  };

  const tierLabels = {
    BRONZE: 'Bronze',
    SILVER: 'Prata',
    GOLD: 'Ouro',
    DIAMOND: 'Diamante',
  };

  const rewardTypeLabels: Record<string, string> = {
    DISCOUNT_PERCENT: 'Desconto Percentual',
    DISCOUNT_FIXED: 'Desconto em Reais',
    FREE_SERVICE: 'Servico Gratuito',
    FREE_PRODUCT: 'Produto Gratuito',
    CASHBACK: 'Cashback',
  };

  const handleCloseModal = () => {
    setShowNewReward(false);
    setFormData({ name: '', description: '', pointsCost: 100, type: 'DISCOUNT_PERCENT', discountValue: 10 });
  };

  const handleSubmitNewReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.pointsCost <= 0) {
      alert('Nome e custo em pontos sao obrigatorios');
      return;
    }

    setSaving(true);
    try {
      const created = await loyaltyApi.createReward({
        name: formData.name,
        description: formData.description || undefined,
        pointsCost: formData.pointsCost,
        type: formData.type,
        discountPercent: formData.type === 'DISCOUNT_PERCENT' ? formData.discountValue : undefined,
        discountAmount: formData.type === 'DISCOUNT_FIXED' ? formData.discountValue : undefined,
      });
      setRewards(prev => [...prev, created as Reward]);
      handleCloseModal();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao criar recompensa');
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
          title="Programa de Fidelidade"
          description="Gerencie pontos, recompensas e fidelizacao de clientes"
        />
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center">
          <Crown className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <h2 className="text-lg font-semibold mb-1">Recurso Premium</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Este recurso faz parte do plano premium do bela360. Peça um cupom de desbloqueio em{' '}
            <a href="/configuracoes" className="text-primary underline">
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
        title="Programa de Fidelidade"
        description="Gerencie pontos, recompensas e fidelizacao de clientes"
        actions={
          <Button onClick={() => setShowNewReward(true)}>
            <Plus className="h-4 w-4" />
            Nova Recompensa
          </Button>
        }
      />

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Clientes no Programa</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-white">
              <Users className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold">{stats?.totalClients ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">clientes ativos</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Pontos Ativos</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-white">
              <Star className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-gold-foreground dark:text-gold">
            {(stats?.totalPointsActive ?? 0).toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">em circulacao</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Pontos Resgatados</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-white">
              <Gift className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {(stats?.totalPointsRedeemed ?? 0).toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">total historico</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Clientes VIP</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-white">
              <Crown className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-bela-purple">
            {(stats?.tierDistribution.GOLD || 0) + (stats?.tierDistribution.DIAMOND || 0)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Ouro + Diamante</p>
        </div>
      </div>

      {/* Tier Distribution */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Award className="h-5 w-5" />
            Distribuicao por Nivel
          </h2>
          <div className="grid grid-cols-4 gap-4">
            {(Object.keys(stats?.tierDistribution || tierLabels) as Array<keyof typeof tierColors>).map((tier) => (
              <div key={tier} className="text-center">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${tierColors[tier]} mb-2`}>
                  <Crown className="h-8 w-8" />
                </div>
                <p className="font-semibold">{tierLabels[tier]}</p>
                <p className="text-2xl font-bold">{stats?.tierDistribution[tier] ?? 0}</p>
                <p className="text-xs text-muted-foreground">clientes</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Rewards */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Recompensas Disponiveis
            </h2>
            <div className="space-y-3">
              {rewards.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma recompensa cadastrada ainda.</p>
              )}
              {rewards.map((reward) => (
                <div key={reward.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-bela-purple/10 rounded-xl">
                      <Gift className="h-5 w-5 text-bela-purple" />
                    </div>
                    <div>
                      <p className="font-medium">{reward.name}</p>
                      <p className="text-sm text-muted-foreground">{reward.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-bela-purple">{reward.pointsCost} pts</p>
                    <p className="text-xs text-muted-foreground">{reward.totalRedemptions} resgates</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Redemptions */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Resgates Recentes
            </h2>
            <div className="space-y-3">
              {recentRedemptions.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum resgate recente.</p>
              )}
              {recentRedemptions.map((redemption) => (
                <div key={redemption.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                  <div>
                    <p className="font-medium">{redemption.client.name}</p>
                    <p className="text-sm text-muted-foreground">{redemption.reward.name}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="success" className="font-mono">
                      {redemption.couponCode}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">-{redemption.pointsUsed} pts</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Program Settings Preview */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5" />
            Configuracoes do Programa
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-muted/50 rounded-xl text-center">
              <p className="text-sm text-muted-foreground">Pontos por R$1</p>
              <p className="text-2xl font-bold">{Number(program?.pointsPerReal ?? 1)}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-xl text-center">
              <p className="text-sm text-muted-foreground">Prata a partir de</p>
              <p className="text-2xl font-bold">{program?.silverThreshold ?? 100} pts</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-xl text-center">
              <p className="text-sm text-muted-foreground">Ouro a partir de</p>
              <p className="text-2xl font-bold">{program?.goldThreshold ?? 500} pts</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-xl text-center">
              <p className="text-sm text-muted-foreground">Diamante a partir de</p>
              <p className="text-2xl font-bold">{program?.diamondThreshold ?? 1000} pts</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* New Reward Modal */}
      <Modal open={showNewReward} onClose={handleCloseModal} title="Nova Recompensa">
        <form onSubmit={handleSubmitNewReward} className="space-y-4">
          <Input
            label="Nome da recompensa *"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Ex: Desconto 15%"
            required
          />
          <Textarea
            label="Descricao"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Descreva a recompensa..."
            rows={2}
          />
          <Select
            label="Tipo de recompensa"
            value={formData.type}
            onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
          >
            <option value="DISCOUNT_PERCENT">Desconto Percentual (%)</option>
            <option value="DISCOUNT_FIXED">Desconto em Reais (R$)</option>
            <option value="FREE_SERVICE">Servico Gratuito</option>
            <option value="FREE_PRODUCT">Produto Gratuito</option>
            <option value="CASHBACK">Cashback</option>
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Custo em pontos *"
              type="number"
              value={formData.pointsCost || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, pointsCost: parseInt(e.target.value) || 0 }))}
              placeholder="100"
              min="1"
              required
            />
            <Input
              label={formData.type === 'DISCOUNT_PERCENT' ? 'Desconto (%)' : 'Valor (R$)'}
              type="number"
              value={formData.discountValue || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, discountValue: parseFloat(e.target.value) || 0 }))}
              placeholder={formData.type === 'DISCOUNT_PERCENT' ? '10' : '50'}
              min="0"
              step={formData.type === 'DISCOUNT_PERCENT' ? '1' : '0.01'}
            />
          </div>
          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseModal}
              disabled={saving}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              loading={saving}
              className="flex-1"
            >
              {saving ? 'Salvando...' : 'Criar Recompensa'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
