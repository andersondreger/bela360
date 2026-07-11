'use client';

import { useState } from 'react';
import { Plus, Save, MessageCircle } from 'lucide-react';
import { PageHeader, Button, Input, Badge } from '@/components/ui';

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<'negocio' | 'horarios' | 'profissionais' | 'whatsapp'>('negocio');

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" description="Gerencie as configurações do seu negócio" />

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-8">
          {[
            { id: 'negocio', label: 'Negócio' },
            { id: 'horarios', label: 'Horários' },
            { id: 'profissionais', label: 'Profissionais' },
            { id: 'whatsapp', label: 'WhatsApp' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`pb-4 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="rounded-2xl border border-border bg-card p-6">
        {activeTab === 'negocio' && (
          <form className="space-y-6 max-w-2xl">
            <Input label="Nome do estabelecimento" type="text" defaultValue="Salao Exemplo" />
            <Input label="Telefone" type="tel" defaultValue="(11) 99999-9999" />
            <Input label="Email" type="email" defaultValue="contato@salao.com" />
            <Input label="Endereco" type="text" defaultValue="Rua Exemplo, 123 - Centro" />
            <div className="grid grid-cols-3 gap-4">
              <Input label="Cidade" type="text" defaultValue="Sao Paulo" />
              <Input label="Estado" type="text" defaultValue="SP" />
              <Input label="CEP" type="text" defaultValue="01234-567" />
            </div>
            <Button type="submit" variant="primary">
              <Save className="w-4 h-4" />
              Salvar alteracoes
            </Button>
          </form>
        )}

        {activeTab === 'horarios' && (
          <div className="space-y-6 max-w-2xl">
            <p className="text-muted-foreground">Configure os horarios de funcionamento do seu negocio.</p>
            {[
              { day: 'Segunda-feira', open: '09:00', close: '18:00', active: true },
              { day: 'Terca-feira', open: '09:00', close: '18:00', active: true },
              { day: 'Quarta-feira', open: '09:00', close: '18:00', active: true },
              { day: 'Quinta-feira', open: '09:00', close: '18:00', active: true },
              { day: 'Sexta-feira', open: '09:00', close: '18:00', active: true },
              { day: 'Sabado', open: '09:00', close: '14:00', active: true },
              { day: 'Domingo', open: '', close: '', active: false },
            ].map((schedule) => (
              <div key={schedule.day} className="flex items-center gap-4 p-4 border border-border rounded-xl">
                <label className="flex items-center gap-2 w-40">
                  <input
                    type="checkbox"
                    defaultChecked={schedule.active}
                    className="rounded border-border text-primary focus:ring-ring"
                  />
                  <span className="text-sm font-medium text-foreground">{schedule.day}</span>
                </label>
                {schedule.active && (
                  <>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        defaultValue={schedule.open}
                        className="px-3 py-1.5 border border-input bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                      />
                      <span className="text-muted-foreground">ate</span>
                      <input
                        type="time"
                        defaultValue={schedule.close}
                        className="px-3 py-1.5 border border-input bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                      />
                    </div>
                  </>
                )}
              </div>
            ))}
            <Button variant="primary">
              <Save className="w-4 h-4" />
              Salvar horarios
            </Button>
          </div>
        )}

        {activeTab === 'profissionais' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground">Gerencie os profissionais do seu negocio.</p>
              <Button variant="primary" size="sm">
                <Plus className="w-4 h-4" />
                Adicionar profissional
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { name: 'Ana Silva', role: 'Cabeleireira', color: '#7C3AED', active: true },
                { name: 'Carlos Santos', role: 'Barbeiro', color: '#EC4899', active: true },
                { name: 'Julia Oliveira', role: 'Cabeleireira', color: '#10B981', active: true },
              ].map((prof) => (
                <div key={prof.name} className="p-4 border border-border rounded-xl bg-card">
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium"
                      style={{ backgroundColor: prof.color }}
                    >
                      {prof.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{prof.name}</p>
                      <p className="text-sm text-muted-foreground">{prof.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    {prof.active ? (
                      <Badge variant="success">Ativo</Badge>
                    ) : (
                      <Badge variant="outline">Inativo</Badge>
                    )}
                    <Button variant="ghost" size="sm" className="text-primary hover:text-primary">
                      Editar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'whatsapp' && (
          <div className="space-y-6 max-w-2xl">
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl dark:bg-emerald-500/10 dark:border-emerald-500/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-emerald-800 dark:text-emerald-400">WhatsApp Conectado</h3>
                  <p className="text-sm text-emerald-600 dark:text-emerald-400/80">+55 11 99999-9999</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-foreground flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-primary" />
                Configuracoes do Bot
              </h3>

              <label className="flex items-center justify-between p-4 border border-border rounded-xl">
                <div>
                  <p className="font-medium text-foreground">Respostas automaticas</p>
                  <p className="text-sm text-muted-foreground">Responder automaticamente mensagens fora do horario</p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-5 h-5 rounded border-border text-primary focus:ring-ring"
                />
              </label>

              <label className="flex items-center justify-between p-4 border border-border rounded-xl">
                <div>
                  <p className="font-medium text-foreground">Lembretes automaticos</p>
                  <p className="text-sm text-muted-foreground">Enviar lembrete 24h antes do agendamento</p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-5 h-5 rounded border-border text-primary focus:ring-ring"
                />
              </label>

              <label className="flex items-center justify-between p-4 border border-border rounded-xl">
                <div>
                  <p className="font-medium text-foreground">Confirmacao automatica</p>
                  <p className="text-sm text-muted-foreground">Confirmar agendamentos automaticamente</p>
                </div>
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-border text-primary focus:ring-ring"
                />
              </label>
            </div>

            <Button variant="primary">
              <Save className="w-4 h-4" />
              Salvar configuracoes
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
