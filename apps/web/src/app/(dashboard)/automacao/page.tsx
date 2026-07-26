'use client';

import { useState, useEffect, useCallback } from 'react';
import { Zap, MessageSquare, Gift, UserX, Clock, ToggleLeft, ToggleRight, Crown, Send, CheckCircle2, TrendingUp } from 'lucide-react';
import { Card, CardContent, Badge, PageHeader } from '@/components/ui';
import { automationApi, isPremiumLockedError } from '@/lib/api';

interface Automation {
  id: string;
  type: string;
  template: string;
  isActive: boolean;
  delayHours?: number | null;
  delayDays?: number | null;
  sendTime?: string | null;
}

interface AutomationStats {
  automations: number;
  activeAutomations: number;
  totalSent: number;
  totalConverted: number;
  conversionRate: number;
}

const automationTypes = {
  POST_APPOINTMENT: { name: 'Pós-Atendimento', icon: MessageSquare, color: 'text-blue-500' },
  RETURN_REMINDER: { name: 'Lembrete de Retorno', icon: Clock, color: 'text-green-500' },
  BIRTHDAY: { name: 'Aniversário', icon: Gift, color: 'text-pink-500' },
  REACTIVATION: { name: 'Reativação', icon: UserX, color: 'text-orange-500' },
};

export default function AutomacaoPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<AutomationStats>({
    automations: 0,
    activeAutomations: 0,
    totalSent: 0,
    totalConverted: 0,
    conversionRate: 0,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    setLocked(false);
    try {
      const [statsData, automationsData] = await Promise.all([
        automationApi.getStats() as Promise<AutomationStats>,
        automationApi.list() as Promise<Automation[]>,
      ]);
      setStats(statsData);
      setAutomations(automationsData);
    } catch (err) {
      if (isPremiumLockedError(err)) {
        setLocked(true);
      } else {
        setError(err instanceof Error ? err.message : 'Erro ao carregar automações');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleAutomation = async (id: string) => {
    const previous = automations;
    setAutomations(prev => prev.map(a => (a.id === id ? { ...a, isActive: !a.isActive } : a)));
    try {
      await automationApi.toggle(id);
    } catch (err) {
      setAutomations(previous);
      if (isPremiumLockedError(err)) {
        setLocked(true);
      } else {
        alert(err instanceof Error ? err.message : 'Erro ao atualizar automação');
      }
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
          title="Automação de Relacionamento"
          description="Configure mensagens automáticas para engajar seus clientes"
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
        title="Automação de Relacionamento"
        description="Configure mensagens automáticas para engajar seus clientes"
      />

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Mensagens Enviadas</p>
              <Send className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.totalSent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Convertidas em Agendamento</p>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold text-amber-500">{stats.totalConverted}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold text-primary">{stats.conversionRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Automations List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500" />
          Automações Configuradas
        </h2>

        {automations.map(automation => {
          const typeInfo = automationTypes[automation.type as keyof typeof automationTypes];
          const Icon = typeInfo?.icon || Zap;

          return (
            <Card key={automation.id}>
              <CardContent className="p-4 flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted ${typeInfo?.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{typeInfo?.name || automation.type}</h3>
                      <Badge variant={automation.isActive ? 'success' : 'outline'}>
                        {automation.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{automation.template}</p>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      {!!automation.delayHours && (
                        <span>Enviar após: {automation.delayHours}h</span>
                      )}
                      {!!automation.delayDays && (
                        <span>Enviar após: {automation.delayDays} dias</span>
                      )}
                      {automation.sendTime && (
                        <span>Horário: {automation.sendTime}</span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => toggleAutomation(automation.id)}
                  className="flex items-center gap-2 text-sm"
                  aria-label={automation.isActive ? 'Desativar automação' : 'Ativar automação'}
                >
                  {automation.isActive ? (
                    <ToggleRight className="h-8 w-8 text-primary" />
                  ) : (
                    <ToggleLeft className="h-8 w-8 text-muted-foreground" />
                  )}
                </button>
              </CardContent>
            </Card>
          );
        })}

        {automations.length === 0 && (
          <div className="p-8 text-center text-muted-foreground rounded-2xl border border-border bg-card">
            Nenhuma automação configurada ainda
          </div>
        )}
      </div>
    </div>
  );
}
