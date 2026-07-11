'use client';

import { useState } from 'react';
import { Settings, Send } from 'lucide-react';
import { WhatsAppConfigModal } from '@/components/WhatsAppConfigModal';
import { Button, Badge, Input, PageHeader } from '@/components/ui';

// TODO: Get from auth context
const MOCK_BUSINESS_ID = 'demo-business-id';

const mockConversations = [
  { id: '1', clientName: 'Maria Silva', lastMessage: 'Quero agendar um corte para amanha', time: '10:30', unread: 2, status: 'waiting' },
  { id: '2', clientName: 'Joao Santos', lastMessage: 'Confirmado! Ate amanha as 14h', time: '10:15', unread: 0, status: 'resolved' },
  { id: '3', clientName: 'Carla Oliveira', lastMessage: 'Qual horario tem disponivel?', time: '09:45', unread: 1, status: 'waiting' },
  { id: '4', clientName: 'Pedro Costa', lastMessage: 'Ok, vou remarcar entao', time: '09:30', unread: 0, status: 'resolved' },
  { id: '5', clientName: 'Ana Souza', lastMessage: 'Boa tarde! Gostaria de saber o preco da coloracao', time: 'Ontem', unread: 1, status: 'waiting' },
];

const mockMessages = [
  { id: '1', content: 'Ola! Gostaria de agendar um horario', direction: 'inbound', time: '10:25' },
  { id: '2', content: 'Ola Maria! Claro, qual servico voce gostaria?', direction: 'outbound', time: '10:26' },
  { id: '3', content: 'Quero fazer um corte', direction: 'inbound', time: '10:28' },
  { id: '4', content: 'Otimo! Temos horarios disponiveis amanha. Qual horario seria melhor para voce?', direction: 'outbound', time: '10:29' },
  { id: '5', content: 'Quero agendar um corte para amanha', direction: 'inbound', time: '10:30' },
];

export default function WhatsAppPage() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>('1');
  const [message, setMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const selectedConv = mockConversations.find(c => c.id === selectedConversation);

  return (
    <div className="h-[calc(100vh-8rem)]">
      <PageHeader
        title="WhatsApp"
        description="Gerencie suas conversas"
        actions={
          <>
            <Badge variant={isConnected ? 'success' : 'destructive'} className="gap-1.5">
              <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
              {isConnected ? 'Conectado' : 'Desconectado'}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => setIsConfigModalOpen(true)}>
              <Settings className="h-4 w-4" />
              Configurar
            </Button>
          </>
        }
      />

      <div className="rounded-2xl border border-border bg-card h-[calc(100%-5rem)] flex overflow-hidden shadow-sm">
        {/* Conversations List */}
        <div className="w-80 border-r border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <Input type="text" placeholder="Buscar conversa..." />
          </div>
          <div className="flex-1 overflow-y-auto">
            {mockConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversation(conv.id)}
                className={`w-full p-4 text-left hover:bg-muted border-b border-border/60 transition-colors ${
                  selectedConversation === conv.id ? 'bg-primary/10' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-medium shrink-0">
                    {conv.clientName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-foreground truncate">{conv.clientName}</p>
                      <span className="text-xs text-muted-foreground">{conv.time}</span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                  </div>
                  {conv.unread > 0 && (
                    <span className="w-5 h-5 bg-gradient-brand text-white text-xs rounded-full flex items-center justify-center shrink-0">
                      {conv.unread}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        {selectedConv ? (
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-medium">
                  {selectedConv.clientName.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="font-medium text-foreground">{selectedConv.clientName}</p>
                  <p className="text-xs text-muted-foreground">Ultima mensagem: {selectedConv.time}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">Ver perfil</Button>
                <Button variant="primary" size="sm">Agendar</Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
              {mockMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                      msg.direction === 'outbound'
                        ? 'bg-gradient-brand text-white rounded-br-md'
                        : 'bg-card text-foreground rounded-bl-md border border-border'
                    }`}
                  >
                    <p>{msg.content}</p>
                    <p className={`text-xs mt-1 ${
                      msg.direction === 'outbound' ? 'text-white/70' : 'text-muted-foreground'
                    }`}>
                      {msg.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                  />
                </div>
                <Button variant="primary" disabled={!message.trim()}>
                  <Send className="h-4 w-4" />
                  Enviar
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Selecione uma conversa
          </div>
        )}
      </div>

      <WhatsAppConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        businessId={MOCK_BUSINESS_ID}
        onStatusChange={setIsConnected}
      />
    </div>
  );
}
