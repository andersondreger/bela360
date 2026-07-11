'use client';

import { useState } from 'react';
import {
  Bell,
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
  MessageSquare,
  Calendar,
  User,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { PageHeader, Button, Badge, Select } from '@/components/ui';

// Mock data - will be replaced with API calls
const mockNotificationStats = {
  todayReminders: 24,
  todayConfirmations: 18,
  deliveredRate: 96,
  readRate: 78,
};

const mockRecentMessages = [
  {
    id: '1',
    type: 'reminder',
    clientName: 'Maria Silva',
    clientPhone: '11999887766',
    content: 'Ola Maria! Lembrete: voce tem horario amanha as 14h para Corte + Escova com Ana.',
    status: 'read',
    createdAt: '2025-01-04T10:30:00',
  },
  {
    id: '2',
    type: 'confirmation',
    clientName: 'Joao Santos',
    clientPhone: '11988776655',
    content: 'Seu agendamento foi confirmado! Te esperamos dia 05/01 as 10h.',
    status: 'delivered',
    createdAt: '2025-01-04T10:15:00',
  },
  {
    id: '3',
    type: 'reminder',
    clientName: 'Carla Oliveira',
    clientPhone: '11977665544',
    content: 'Ola Carla! Lembrete: voce tem horario hoje as 15h para Coloracao com Maria.',
    status: 'sent',
    createdAt: '2025-01-04T09:45:00',
  },
  {
    id: '4',
    type: 'birthday',
    clientName: 'Pedro Costa',
    clientPhone: '11966554433',
    content: 'Feliz Aniversario, Pedro! Voce tem 10% de desconto hoje. Use o codigo NIVER10.',
    status: 'read',
    createdAt: '2025-01-04T08:00:00',
  },
  {
    id: '5',
    type: 'reactivation',
    clientName: 'Ana Souza',
    clientPhone: '11955443322',
    content: 'Ola Ana! Sentimos sua falta. Que tal agendar um horario? Temos uma oferta especial!',
    status: 'delivered',
    createdAt: '2025-01-03T16:00:00',
  },
  {
    id: '6',
    type: 'reminder',
    clientName: 'Lucas Ferreira',
    clientPhone: '11944332211',
    content: 'Ola Lucas! Lembrete: voce tem horario amanha as 09h para Barba com Carlos.',
    status: 'failed',
    createdAt: '2025-01-03T14:30:00',
  },
];

const mockScheduledNotifications = [
  {
    id: '1',
    type: 'reminder',
    clientName: 'Fernanda Lima',
    scheduledFor: '2025-01-04T12:00:00',
    appointmentTime: '2025-01-05T14:00:00',
    service: 'Manicure',
  },
  {
    id: '2',
    type: 'reminder',
    clientName: 'Roberto Alves',
    scheduledFor: '2025-01-04T14:00:00',
    appointmentTime: '2025-01-05T16:00:00',
    service: 'Corte Masculino',
  },
  {
    id: '3',
    type: 'confirmation_request',
    clientName: 'Juliana Martins',
    scheduledFor: '2025-01-04T16:00:00',
    appointmentTime: '2025-01-04T18:00:00',
    service: 'Escova',
  },
];

function getStatusIcon(status: string) {
  switch (status) {
    case 'read':
      return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    case 'delivered':
      return <CheckCircle className="w-4 h-4 text-blue-500" />;
    case 'sent':
      return <Send className="w-4 h-4 text-muted-foreground" />;
    case 'failed':
      return <AlertCircle className="w-4 h-4 text-destructive" />;
    default:
      return <Clock className="w-4 h-4 text-muted-foreground" />;
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'read':
      return 'Lida';
    case 'delivered':
      return 'Entregue';
    case 'sent':
      return 'Enviada';
    case 'failed':
      return 'Falhou';
    default:
      return 'Pendente';
  }
}

function getTypeBadge(type: string) {
  switch (type) {
    case 'reminder':
      return { label: 'Lembrete', variant: 'default' as const, className: '' };
    case 'confirmation':
      return { label: 'Confirmacao', variant: 'success' as const, className: '' };
    case 'birthday':
      return {
        label: 'Aniversario',
        variant: 'default' as const,
        className: 'bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-400',
      };
    case 'reactivation':
      return {
        label: 'Reativacao',
        variant: 'default' as const,
        className: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400',
      };
    case 'confirmation_request':
      return { label: 'Pedir Confirmacao', variant: 'info' as const, className: '' };
    default:
      return { label: 'Mensagem', variant: 'outline' as const, className: '' };
  }
}

function formatDateTime(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function NotificacoesPage() {
  const [filter, setFilter] = useState<'all' | 'reminder' | 'confirmation' | 'birthday' | 'reactivation'>('all');
  const stats = mockNotificationStats;

  const filteredMessages = filter === 'all'
    ? mockRecentMessages
    : mockRecentMessages.filter(m => m.type === filter);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notificacoes"
        description="Acompanhe os lembretes e mensagens automaticas"
        actions={
          <Button variant="primary">
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Lembretes Hoje</span>
            <div className="w-10 h-10 bg-gradient-brand text-white rounded-xl flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground mt-4">{stats.todayReminders}</p>
          <p className="text-sm text-muted-foreground mt-1">mensagens enviadas</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Confirmacoes</span>
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-500/15 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground mt-4">{stats.todayConfirmations}</p>
          <p className="text-sm text-muted-foreground mt-1">clientes confirmaram</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Taxa de Entrega</span>
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-500/15 rounded-xl flex items-center justify-center">
              <Send className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground mt-4">{stats.deliveredRate}%</p>
          <p className="text-sm text-muted-foreground mt-1">mensagens entregues</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Taxa de Leitura</span>
            <div className="w-10 h-10 bg-gold/15 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-gold-foreground dark:text-gold" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground mt-4">{stats.readRate}%</p>
          <p className="text-sm text-muted-foreground mt-1">mensagens lidas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Messages */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card shadow-sm">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Mensagens Recentes</h2>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="h-9 text-sm px-3"
                >
                  <option value="all">Todas</option>
                  <option value="reminder">Lembretes</option>
                  <option value="confirmation">Confirmacoes</option>
                  <option value="birthday">Aniversarios</option>
                  <option value="reactivation">Reativacao</option>
                </Select>
              </div>
            </div>
          </div>
          <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
            {filteredMessages.map((message) => {
              const typeInfo = getTypeBadge(message.type);
              return (
                <div key={message.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center text-accent-foreground font-medium shrink-0">
                      {message.clientName.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-foreground">{message.clientName}</span>
                        <Badge variant={typeInfo.variant} className={typeInfo.className}>
                          {typeInfo.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{message.content}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs text-muted-foreground/70">{formatDateTime(message.createdAt)}</span>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(message.status)}
                          <span className={`text-xs ${
                            message.status === 'failed' ? 'text-destructive' : 'text-muted-foreground'
                          }`}>
                            {getStatusLabel(message.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Scheduled Notifications */}
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Proximos Envios</h2>
            <p className="text-sm text-muted-foreground">Notificacoes agendadas</p>
          </div>
          <div className="divide-y divide-border">
            {mockScheduledNotifications.map((notification) => {
              const typeInfo = getTypeBadge(notification.type);
              return (
                <div key={notification.id} className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">
                      {formatTime(notification.scheduledFor)}
                    </span>
                    <Badge variant={typeInfo.variant} className={typeInfo.className}>
                      {typeInfo.label}
                    </Badge>
                  </div>
                  <div className="ml-7">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">{notification.clientName}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {notification.service} - {formatDateTime(notification.appointmentTime)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="p-4 border-t border-border">
            <p className="text-sm text-muted-foreground text-center">
              Lembretes sao enviados automaticamente 24h e 2h antes do horario agendado
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
