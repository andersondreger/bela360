'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Settings, Send } from 'lucide-react';
import { WhatsAppConfigModal } from '@/components/WhatsAppConfigModal';
import { Button, Badge, Input, PageHeader } from '@/components/ui';
import { whatsappApi, type Conversation, type ConversationMessage } from '@/lib/api';

function formatTime(iso: string | undefined) {
  if (!iso) return '';
  const date = new Date(iso);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  if (isToday) return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

export default function WhatsAppPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      const data = await whatsappApi.listConversations();
      setConversations(data);
    } catch {
      // silencioso - o badge de status já mostra se o WhatsApp está desconectado
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 15000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  useEffect(() => {
    whatsappApi
      .getStatus()
      .then((s) => setIsConnected(s.connected))
      .catch(() => setIsConnected(false));
  }, []);

  const loadMessages = useCallback(async (clientId: string) => {
    setLoadingMessages(true);
    try {
      const data = await whatsappApi.getConversationMessages(clientId);
      setMessages(data);
    } catch {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (selectedClientId) loadMessages(selectedClientId);
  }, [selectedClientId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectedConv = conversations.find(c => c.client.id === selectedClientId);

  const filteredConversations = conversations.filter(c =>
    c.client.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSend = async () => {
    if (!message.trim() || !selectedClientId || sending) return;
    setSending(true);
    const text = message;
    setMessage('');
    try {
      const sent = await whatsappApi.sendConversationMessage(selectedClientId, text);
      setMessages(prev => [...prev, sent]);
      loadConversations();
    } catch {
      setMessage(text);
    } finally {
      setSending(false);
    }
  };

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
            <Input
              type="text"
              placeholder="Buscar conversa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingConversations ? (
              <p className="p-4 text-sm text-muted-foreground">Carregando conversas...</p>
            ) : filteredConversations.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                {isConnected
                  ? 'Nenhuma conversa ainda. Assim que um cliente mandar mensagem, ela aparece aqui.'
                  : 'Conecte o WhatsApp pra começar a receber conversas.'}
              </p>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.client.id}
                  onClick={() => setSelectedClientId(conv.client.id)}
                  className={`w-full p-4 text-left hover:bg-muted border-b border-border/60 transition-colors ${
                    selectedClientId === conv.client.id ? 'bg-primary/10' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-medium shrink-0">
                      {initials(conv.client.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-foreground truncate">{conv.client.name}</p>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(conv.lastMessage?.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {conv.lastMessage?.content ?? ''}
                      </p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="w-5 h-5 bg-gradient-brand text-white text-xs rounded-full flex items-center justify-center shrink-0">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        {selectedConv ? (
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-medium">
                  {initials(selectedConv.client.name)}
                </div>
                <div>
                  <p className="font-medium text-foreground">{selectedConv.client.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedConv.client.phone}</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
              {loadingMessages ? (
                <p className="text-sm text-muted-foreground">Carregando mensagens...</p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                        msg.direction === 'OUTBOUND'
                          ? 'bg-gradient-brand text-white rounded-br-md'
                          : 'bg-card text-foreground rounded-bl-md border border-border'
                      }`}
                    >
                      <p>{msg.content}</p>
                      <p className={`text-xs mt-1 ${
                        msg.direction === 'OUTBOUND' ? 'text-white/70' : 'text-muted-foreground'
                      }`}>
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Digite sua mensagem..."
                  />
                </div>
                <Button variant="primary" disabled={!message.trim() || sending} onClick={handleSend}>
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
        onStatusChange={setIsConnected}
      />
    </div>
  );
}
