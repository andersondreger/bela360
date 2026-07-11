'use client';

import { useState, useEffect } from 'react';
import { Zap, MessageSquare, Gift, UserX, Clock, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card, CardContent, Badge, PageHeader } from '@/components/ui';

interface Automation {
  id: string;
  type: string;
  template: string;
  isActive: boolean;
  delayHours?: number;
  delayDays?: number;
  sendTime?: string;
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
  const [stats, setStats] = useState({ sent: 0, pending: 0, failed: 0 });

  useEffect(() => {
    // Simulated data - replace with API call
    setAutomations([
      {
        id: '1',
        type: 'POST_APPOINTMENT',
        template: 'Olá {{nome}}! Obrigado pela visita hoje. Como foi seu {{servico}}? Avalie de 1 a 5',
        isActive: true,
        delayHours: 2,
      },
      {
        id: '2',
        type: 'RETURN_REMINDER',
        template: 'Oi {{nome}}! Já faz {{dias}} dias desde seu último {{servico}}. Que tal agendar?',
        isActive: false,
        delayDays: 30,
        sendTime: '10:00',
      },
      {
        id: '3',
        type: 'BIRTHDAY',
        template: 'Feliz aniversário, {{nome}}! Como presente, preparamos algo especial para você...',
        isActive: true,
        sendTime: '09:00',
      },
      {
        id: '4',
        type: 'REACTIVATION',
        template: 'Oi {{nome}}, sentimos sua falta! Faz tempo que não nos vemos. Que tal voltar?',
        isActive: false,
        delayDays: 60,
        sendTime: '10:00',
      },
    ]);
    setStats({ sent: 156, pending: 12, failed: 3 });
    setLoading(false);
  }, []);

  const toggleAutomation = (id: string) => {
    setAutomations(prev =>
      prev.map(a => (a.id === id ? { ...a, isActive: !a.isActive } : a))
    );
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
        title="Automação de Relacionamento"
        description="Configure mensagens automáticas para engajar seus clientes"
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Mensagens Enviadas</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.sent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Pendentes</p>
            <p className="text-2xl font-bold text-amber-500">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Falhas</p>
            <p className="text-2xl font-bold text-red-500">{stats.failed}</p>
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
                      {automation.delayHours && (
                        <span>Enviar após: {automation.delayHours}h</span>
                      )}
                      {automation.delayDays && (
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
      </div>
    </div>
  );
}
