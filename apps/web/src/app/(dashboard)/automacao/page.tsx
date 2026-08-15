'use client';

import { useState, useEffect, useCallback } from 'react';
import { Zap, MessageSquare, Gift, UserX, Clock, ToggleLeft, ToggleRight, Crown, Send, CheckCircle2, TrendingUp, Pencil, Sun, Plus, Trash2, Info } from 'lucide-react';
import { Card, CardContent, Badge, Button, Modal, Input, Textarea, Select, PageHeader } from '@/components/ui';
import { automationApi, servicesApi, isPremiumLockedError, type Service } from '@/lib/api';

interface Automation {
  id: string;
  type: string;
  template: string;
  isActive: boolean;
  delayHours?: number | null;
  delayDays?: number | null;
  sendTime?: string | null;
  serviceId?: string | null;
  service?: { id: string; name: string } | null;
}

// Só esses dois tipos são resolvidos por serviço específico do atendimento (ver
// automation.service.ts schedulePostAppointment/scheduleReturnReminder). Os
// demais (aniversário, reativação, lembrete no dia) são sempre do negócio inteiro.
const SERVICE_SCOPED_TYPES = ['POST_APPOINTMENT', 'RETURN_REMINDER'] as const;

const VARIABLES_BY_TYPE: Record<string, string[]> = {
  POST_APPOINTMENT: ['{{nome}}', '{{servico}}'],
  RETURN_REMINDER: ['{{nome}}', '{{servico}}', '{{dias}}'],
  BIRTHDAY: ['{{nome}}'],
  REACTIVATION: ['{{nome}}', '{{dias}}'],
  REMINDER_SAME_DAY: ['{{nome}}', '{{servico}}'],
};

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
  REMINDER_SAME_DAY: { name: 'Lembrete no Dia', icon: Sun, color: 'text-amber-500' },
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
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);
  const [editForm, setEditForm] = useState({ template: '', delayHours: '', delayDays: '', sendTime: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  const [services, setServices] = useState<Service[]>([]);
  const [showNewAutomation, setShowNewAutomation] = useState(false);
  const [newForm, setNewForm] = useState({
    type: 'POST_APPOINTMENT' as (typeof SERVICE_SCOPED_TYPES)[number],
    serviceId: '',
    template: '',
    delayHours: '2',
    delayDays: '',
    sendTime: '',
  });
  const [savingNew, setSavingNew] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    setLocked(false);
    try {
      const [statsData, automationsData, servicesData] = await Promise.all([
        automationApi.getStats() as Promise<AutomationStats>,
        automationApi.list() as Promise<Automation[]>,
        servicesApi.list().catch(() => []),
      ]);
      setStats(statsData);
      setAutomations(automationsData);
      setServices(servicesData);
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

  const handleOpenEdit = (automation: Automation) => {
    setEditingAutomation(automation);
    setEditForm({
      template: automation.template,
      delayHours: automation.delayHours != null ? String(automation.delayHours) : '',
      delayDays: automation.delayDays != null ? String(automation.delayDays) : '',
      sendTime: automation.sendTime || '',
    });
  };

  const handleCloseEdit = () => {
    setEditingAutomation(null);
    setEditForm({ template: '', delayHours: '', delayDays: '', sendTime: '' });
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAutomation || !editForm.template.trim()) {
      alert('A mensagem não pode ficar vazia');
      return;
    }

    setSavingEdit(true);
    try {
      const updated = await automationApi.update(editingAutomation.id, {
        template: editForm.template,
        delayHours: editForm.delayHours ? Number(editForm.delayHours) : undefined,
        delayDays: editForm.delayDays ? Number(editForm.delayDays) : undefined,
        sendTime: editForm.sendTime || undefined,
      });
      setAutomations(prev => prev.map(a => (a.id === editingAutomation.id ? { ...a, ...(updated as Automation) } : a)));
      handleCloseEdit();
    } catch (err) {
      if (isPremiumLockedError(err)) {
        setLocked(true);
      } else {
        alert(err instanceof Error ? err.message : 'Erro ao salvar mensagem');
      }
    } finally {
      setSavingEdit(false);
    }
  };

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

  const handleOpenNew = () => {
    setNewForm({
      type: 'POST_APPOINTMENT',
      serviceId: '',
      template: '',
      delayHours: '2',
      delayDays: '',
      sendTime: '',
    });
    setShowNewAutomation(true);
  };

  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.serviceId) {
      alert('Selecione o serviço/atendimento pra essa automação valer.');
      return;
    }
    if (!newForm.template.trim()) {
      alert('A mensagem não pode ficar vazia');
      return;
    }
    setSavingNew(true);
    try {
      await automationApi.create({
        type: newForm.type,
        serviceId: newForm.serviceId,
        template: newForm.template,
        delayHours: newForm.delayHours ? Number(newForm.delayHours) : undefined,
        delayDays: newForm.delayDays ? Number(newForm.delayDays) : undefined,
        sendTime: newForm.sendTime || undefined,
        isActive: true,
      });
      await loadData();
      setShowNewAutomation(false);
    } catch (err) {
      if (isPremiumLockedError(err)) {
        setLocked(true);
      } else {
        alert(err instanceof Error ? err.message : 'Erro ao criar automação');
      }
    } finally {
      setSavingNew(false);
    }
  };

  const handleDelete = async (automation: Automation) => {
    if (!confirm('Remover esta automação específica de atendimento?')) return;
    setDeletingId(automation.id);
    try {
      await automationApi.delete(automation.id);
      setAutomations(prev => prev.filter(a => a.id !== automation.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao remover automação');
    } finally {
      setDeletingId(null);
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
        actions={
          <Button onClick={handleOpenNew}>
            <Plus className="h-4 w-4" />
            Nova automação por atendimento
          </Button>
        }
      />

      <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          As mensagens usam variáveis entre chaves duplas que são trocadas pelo valor real na hora do envio:{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">{'{{nome}}'}</code> (nome do cliente),{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">{'{{servico}}'}</code> (serviço do atendimento) e{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">{'{{dias}}'}</code> (dias desde a última visita, em
          Reativação e Retorno). &quot;Pós-atendimento&quot; e &quot;Lembrete de retorno&quot; podem ter uma mensagem
          diferente por serviço — use o botão acima pra criar uma específica, por exemplo pro seu serviço de
          coloração ter um lembrete de retorno diferente do genérico.
        </p>
      </div>

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
                      {automation.service && (
                        <Badge variant="info">{automation.service.name}</Badge>
                      )}
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

                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleOpenEdit(automation)} title="Editar mensagem">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {automation.serviceId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-destructive"
                      onClick={() => handleDelete(automation)}
                      loading={deletingId === automation.id}
                      title="Remover automação específica"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
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
                </div>
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

      {/* Edit Message Modal */}
      <Modal open={!!editingAutomation} onClose={handleCloseEdit} title="Editar Mensagem">
        {editingAutomation && (
          <form onSubmit={handleSubmitEdit} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {automationTypes[editingAutomation.type as keyof typeof automationTypes]?.name || editingAutomation.type}
            </p>
            <Textarea
              label="Mensagem"
              value={editForm.template}
              onChange={(e) => setEditForm(prev => ({ ...prev, template: e.target.value }))}
              rows={4}
              placeholder={`Variáveis disponíveis: ${(VARIABLES_BY_TYPE[editingAutomation.type] || ['{{nome}}']).join(', ')}`}
            />
            <p className="text-xs text-muted-foreground -mt-2">
              Variáveis disponíveis aqui: {(VARIABLES_BY_TYPE[editingAutomation.type] || ['{{nome}}']).join(', ')}
            </p>
            {editingAutomation.delayHours != null && (
              <Input
                label="Enviar após (horas)"
                type="number"
                min="0"
                value={editForm.delayHours}
                onChange={(e) => setEditForm(prev => ({ ...prev, delayHours: e.target.value }))}
              />
            )}
            {editingAutomation.delayDays != null && (
              <Input
                label="Enviar após (dias)"
                type="number"
                min="0"
                value={editForm.delayDays}
                onChange={(e) => setEditForm(prev => ({ ...prev, delayDays: e.target.value }))}
              />
            )}
            {editingAutomation.sendTime != null && (
              <Input
                label="Horário de envio"
                type="time"
                value={editForm.sendTime}
                onChange={(e) => setEditForm(prev => ({ ...prev, sendTime: e.target.value }))}
              />
            )}
            <div className="flex gap-4 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseEdit} disabled={savingEdit} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" loading={savingEdit} className="flex-1">
                {savingEdit ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* New Service-Specific Automation Modal */}
      <Modal
        open={showNewAutomation}
        onClose={() => setShowNewAutomation(false)}
        title="Nova automação por atendimento"
        description="Cria uma mensagem diferente da genérica pra um serviço específico"
      >
        <form onSubmit={handleSubmitNew} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Gatilho</label>
            <Select
              value={newForm.type}
              onChange={(e) => setNewForm(prev => ({ ...prev, type: e.target.value as typeof prev.type }))}
            >
              {SERVICE_SCOPED_TYPES.map((type) => (
                <option key={type} value={type}>
                  {automationTypes[type].name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Serviço/atendimento *</label>
            <Select
              value={newForm.serviceId}
              onChange={(e) => setNewForm(prev => ({ ...prev, serviceId: e.target.value }))}
              required
            >
              <option value="">Selecione o serviço</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </Select>
          </div>
          <Textarea
            label="Mensagem"
            value={newForm.template}
            onChange={(e) => setNewForm(prev => ({ ...prev, template: e.target.value }))}
            rows={4}
            placeholder={`Variáveis disponíveis: ${VARIABLES_BY_TYPE[newForm.type].join(', ')}`}
          />
          <p className="text-xs text-muted-foreground -mt-2">
            Variáveis disponíveis aqui: {VARIABLES_BY_TYPE[newForm.type].join(', ')}
          </p>
          {newForm.type === 'POST_APPOINTMENT' ? (
            <Input
              label="Enviar após (horas)"
              type="number"
              min="0"
              value={newForm.delayHours}
              onChange={(e) => setNewForm(prev => ({ ...prev, delayHours: e.target.value }))}
            />
          ) : (
            <Input
              label="Enviar após (dias sem retornar)"
              type="number"
              min="0"
              value={newForm.delayDays}
              onChange={(e) => setNewForm(prev => ({ ...prev, delayDays: e.target.value }))}
            />
          )}
          <div className="flex gap-4 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowNewAutomation(false)} disabled={savingNew} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" loading={savingNew} className="flex-1">
              {savingNew ? 'Criando...' : 'Criar automação'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
