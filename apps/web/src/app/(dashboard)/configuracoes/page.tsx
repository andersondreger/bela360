'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, Save, MessageCircle, CheckCircle2, Sparkles, Upload, Loader2, Pencil, Trash2, Settings } from 'lucide-react';
import { PageHeader, Button, Input, Badge, Modal } from '@/components/ui';
import { WhatsAppConfigModal } from '@/components/WhatsAppConfigModal';
import {
  businessApi,
  platformApi,
  whatsappApi,
  uploadImage,
  PREMIUM_MODULE_LABELS,
  type Business,
  type BusinessBranding,
  type PremiumModule,
  type Professional,
  type ProfessionalInput,
  type WhatsAppStatus,
} from '@/lib/api';

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<'negocio' | 'marca' | 'plano' | 'horarios' | 'profissionais' | 'whatsapp'>('negocio');

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" description="Gerencie as configurações do seu negócio" />

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-8">
          {[
            { id: 'negocio', label: 'Negócio' },
            { id: 'marca', label: 'Marca' },
            { id: 'plano', label: 'Plano' },
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
        {activeTab === 'negocio' && <NegocioTab />}

        {activeTab === 'marca' && <MarcaTab />}

        {activeTab === 'plano' && <PlanoTab />}

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

        {activeTab === 'profissionais' && <ProfissionaisTab />}

        {activeTab === 'whatsapp' && <WhatsappTab />}
      </div>
    </div>
  );
}

interface NegocioForm {
  name: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

const EMPTY_NEGOCIO_FORM: NegocioForm = { name: '', email: '', address: '', city: '', state: '', zipCode: '' };

function NegocioTab() {
  const [form, setForm] = useState<NegocioForm>(EMPTY_NEGOCIO_FORM);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    businessApi
      .getCurrent()
      .then((business) => {
        setForm({
          name: business.name || '',
          email: business.email || '',
          address: business.address || '',
          city: business.city || '',
          state: business.state || '',
          zipCode: business.zipCode || '',
        });
        setPhone(business.phone || '');
      })
      .catch(() => setError('Não foi possível carregar os dados do negócio.'))
      .finally(() => setLoading(false));
  }, []);

  const update = (field: keyof NegocioForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = field === 'state' ? e.target.value.toUpperCase().slice(0, 2) : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const business = await businessApi.updateInfo({
        name: form.name?.trim() || undefined,
        email: form.email?.trim() || undefined,
        address: form.address?.trim() || undefined,
        city: form.city?.trim() || undefined,
        state: form.state?.trim() || undefined,
        zipCode: form.zipCode?.trim() || undefined,
      });
      setForm({
        name: business.name || '',
        email: business.email || '',
        address: business.address || '',
        city: business.city || '',
        state: business.state || '',
        zipCode: business.zipCode || '',
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar as alterações.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Carregando...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <Input label="Nome do estabelecimento" type="text" required minLength={2} value={form.name} onChange={update('name')} />
      <Input
        label="Telefone"
        type="tel"
        value={phone}
        disabled
        title="O telefone é o login da conta e não pode ser alterado por aqui."
      />
      <Input label="Email" type="email" value={form.email} onChange={update('email')} placeholder="contato@salao.com" />
      <Input label="Endereço" type="text" value={form.address} onChange={update('address')} placeholder="Rua Exemplo, 123 - Centro" />
      <div className="grid grid-cols-3 gap-4">
        <Input label="Cidade" type="text" value={form.city} onChange={update('city')} />
        <Input label="Estado" type="text" value={form.state} onChange={update('state')} maxLength={2} placeholder="SP" />
        <Input label="CEP" type="text" value={form.zipCode} onChange={update('zipCode')} placeholder="01234-567" />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" variant="primary" loading={saving}>
        {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {saved ? 'Salvo!' : 'Salvar alterações'}
      </Button>
    </form>
  );
}

function MarcaTab() {
  const [branding, setBranding] = useState<BusinessBranding>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    businessApi
      .getCurrent()
      .then((business) => setBranding(business.settings?.branding || {}))
      .catch(() => setError('Não foi possível carregar a marca atual.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const business = await businessApi.updateBranding(branding);
      setBranding(business.settings?.branding || branding);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar a marca.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setError('');
    try {
      const { url } = await uploadImage(file);
      setBranding((b) => ({ ...b, logoUrl: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar o logo.');
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Carregando...</p>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <p className="text-muted-foreground">
        Personalize como o seu negócio aparece dentro do painel: nome de exibição, logo e cor principal — no lugar do logo padrão do bela360.
      </p>

      <Input
        label="Nome de exibição"
        type="text"
        placeholder="Ex: Studio Bela Vida"
        value={branding.displayName || ''}
        onChange={(e) => setBranding((b) => ({ ...b, displayName: e.target.value }))}
      />

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">Logo do negócio</label>
        <div className="flex items-center gap-3">
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoUrl} alt="Logo" className="h-12 w-12 rounded-xl object-cover border border-border" />
          ) : (
            <div className="h-12 w-12 rounded-xl border border-dashed border-border" />
          )}
          <Button type="button" variant="outline" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
            {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploadingLogo ? 'Enviando...' : branding.logoUrl ? 'Trocar logo' : 'Enviar logo'}
          </Button>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleLogoChange}
          />
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">JPG, PNG ou WEBP. Fotos grandes são redimensionadas automaticamente.</p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">Cor principal</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={branding.primaryColor || '#8B2FE0'}
            onChange={(e) => setBranding((b) => ({ ...b, primaryColor: e.target.value }))}
            className="h-10 w-14 cursor-pointer rounded-lg border border-input bg-background"
          />
          <Input
            type="text"
            value={branding.primaryColor || ''}
            placeholder="#8B2FE0"
            onChange={(e) => setBranding((b) => ({ ...b, primaryColor: e.target.value }))}
            className="flex-1"
          />
        </div>
      </div>

      {(branding.logoUrl || branding.displayName) && (
        <div className="rounded-xl border border-border p-4">
          <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Pré-visualização</p>
          <div className="flex items-center gap-2.5">
            {branding.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoUrl} alt="Logo" className="h-9 w-9 rounded-lg object-cover" />
            )}
            <span className="text-lg font-bold tracking-tight text-foreground">
              {branding.displayName || 'Nome do negócio'}
            </span>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="button" variant="primary" onClick={handleSave} loading={saving}>
        {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {saved ? 'Salvo!' : 'Salvar marca'}
      </Button>
    </div>
  );
}

const ALL_PREMIUM_MODULES = Object.keys(PREMIUM_MODULE_LABELS) as PremiumModule[];

function PlanoTab() {
  const [unlocked, setUnlocked] = useState<Partial<Record<PremiumModule, string>>>({});
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadStatus = () => {
    setLoading(true);
    businessApi
      .getCurrent()
      .then((business) => setUnlocked(business.settings?.premiumModules || {}))
      .catch(() => setError('Não foi possível carregar o plano atual.'))
      .finally(() => setLoading(false));
  };

  useEffect(loadStatus, []);

  const isActive = (moduleUntil?: string) => !!moduleUntil && new Date(moduleUntil).getTime() > Date.now();

  const handleRedeem = async () => {
    if (!code.trim()) return;
    setRedeeming(true);
    setError('');
    setMessage('');
    try {
      const business = await platformApi.redeemCoupon(code.trim());
      setUnlocked(business.settings?.premiumModules || {});
      setMessage('Cupom aplicado! Os módulos abaixo já estão liberados.');
      setCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao resgatar o cupom.');
    } finally {
      setRedeeming(false);
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Carregando...</p>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <p className="text-muted-foreground">
        O bela360 básico já cobre agenda, clientes, serviços e WhatsApp. Marketing, automação, fidelidade e
        estoque fazem parte do plano premium — fale com o suporte para receber um cupom de desbloqueio.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ALL_PREMIUM_MODULES.map((module) => {
          const active = isActive(unlocked[module]);
          return (
            <div
              key={module}
              className={`rounded-xl border p-3 text-center ${
                active ? 'border-primary/50 bg-primary/5' : 'border-border'
              }`}
            >
              <Sparkles className={`mx-auto mb-1.5 h-5 w-5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
              <p className="text-sm font-medium text-foreground">{PREMIUM_MODULE_LABELS[module]}</p>
              <Badge variant={active ? 'success' : 'default'} className="mt-1.5">
                {active ? 'Liberado' : 'Bloqueado'}
              </Badge>
            </div>
          );
        })}
      </div>

      <div className="flex items-end gap-3">
        <Input
          label="Código do cupom"
          type="text"
          placeholder="Ex: A3F9C1B2"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="flex-1"
        />
        <Button type="button" variant="primary" onClick={handleRedeem} loading={redeeming}>
          Resgatar cupom
        </Button>
      </div>

      {message && <p className="text-sm text-emerald-600">{message}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

const ROLE_LABELS: Record<Professional['role'], string> = {
  PROFESSIONAL: 'Profissional',
  ADMIN: 'Administrador',
  RECEPTIONIST: 'Recepcionista',
  OWNER: 'Proprietário(a)',
};

const EMPTY_PROFESSIONAL_FORM: ProfessionalInput = {
  name: '',
  phone: '',
  email: '',
  role: 'PROFESSIONAL',
  color: '#7C3AED',
  commission: undefined,
};

function ProfissionaisTab() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Professional | null>(null);
  const [form, setForm] = useState<ProfessionalInput>(EMPTY_PROFESSIONAL_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadProfessionals = () => {
    setLoading(true);
    businessApi
      .getProfessionals()
      .then(setProfessionals)
      .catch(() => setListError('Não foi possível carregar os profissionais.'))
      .finally(() => setLoading(false));
  };

  useEffect(loadProfessionals, []);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_PROFESSIONAL_FORM);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (prof: Professional) => {
    setEditing(prof);
    setForm({
      name: prof.name,
      phone: prof.phone,
      email: prof.email || '',
      role: prof.role === 'OWNER' ? 'ADMIN' : prof.role,
      color: prof.color || '#7C3AED',
      commission: prof.commission ? Number(prof.commission) : undefined,
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setFormError('Preencha nome e telefone.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload: ProfessionalInput = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email?.trim() || undefined,
        role: form.role,
        color: form.color,
        commission: form.commission,
      };
      if (editing) {
        await businessApi.updateProfessional(editing.id, payload);
      } else {
        await businessApi.addProfessional(payload);
      }
      setShowModal(false);
      loadProfessionals();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar profissional.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (prof: Professional) => {
    if (!confirm(`Remover ${prof.name} da equipe? O profissional deixará de aparecer na agenda.`)) return;
    setRemovingId(prof.id);
    try {
      await businessApi.removeProfessional(prof.id);
      setProfessionals((list) => list.filter((p) => p.id !== prof.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao remover profissional.');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">Gerencie os profissionais do seu negócio.</p>
        <Button variant="primary" size="sm" onClick={openAdd}>
          <Plus className="w-4 h-4" />
          Adicionar profissional
        </Button>
      </div>

      {listError && <p className="text-sm text-destructive">{listError}</p>}

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : professionals.length === 0 ? (
        <p className="text-muted-foreground">Nenhum profissional cadastrado ainda.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {professionals.map((prof) => (
            <div key={prof.id} className="p-4 border border-border rounded-xl bg-card">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium shrink-0"
                  style={{ backgroundColor: prof.color || '#7C3AED' }}
                >
                  {prof.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{prof.name}</p>
                  <p className="text-sm text-muted-foreground">{ROLE_LABELS[prof.role]}</p>
                  <p className="text-xs text-muted-foreground truncate">{prof.phone}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                {prof.isActive ? (
                  <Badge variant="success">Ativo</Badge>
                ) : (
                  <Badge variant="outline">Inativo</Badge>
                )}
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="text-primary hover:text-primary" onClick={() => openEdit(prof)}>
                    <Pencil className="w-3.5 h-3.5" />
                    Editar
                  </Button>
                  {prof.role !== 'OWNER' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleRemove(prof)}
                      loading={removingId === prof.id}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Editar profissional' : 'Adicionar profissional'}
        description="Esses dados aparecem na agenda e no perfil público de agendamento."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome completo"
            type="text"
            required
            minLength={2}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="Telefone (WhatsApp)"
            type="tel"
            required
            placeholder="11999999999"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Função</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as ProfessionalInput['role'] }))}
              className="w-full px-3 py-2 border border-input bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            >
              <option value="PROFESSIONAL">Profissional</option>
              <option value="ADMIN">Administrador</option>
              <option value="RECEPTIONIST">Recepcionista</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Cor na agenda</label>
              <input
                type="color"
                value={form.color || '#7C3AED'}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                className="h-10 w-full cursor-pointer rounded-lg border border-input bg-background"
              />
            </div>
            <Input
              label="Comissão (%)"
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={form.commission ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, commission: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            O telefone é usado pelo profissional para receber o código de acesso pelo WhatsApp (ou Telegram, se o
            WhatsApp do sistema ainda não estiver conectado).
          </p>

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              <Save className="w-4 h-4" />
              {editing ? 'Salvar alterações' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function WhatsappTab() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfig, setShowConfig] = useState(false);

  const loadStatus = () => {
    setLoading(true);
    whatsappApi
      .getStatus()
      .then(setStatus)
      .catch(() => setStatus({ connected: false, state: 'unknown', connectedAt: null }))
      .finally(() => setLoading(false));
  };

  useEffect(loadStatus, []);

  return (
    <div className="space-y-6 max-w-2xl">
      {loading ? (
        <p className="text-muted-foreground">Verificando conexão...</p>
      ) : status?.connected ? (
        <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl dark:bg-emerald-500/10 dark:border-emerald-500/20">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-emerald-800 dark:text-emerald-400">WhatsApp Conectado</h3>
                <p className="text-sm text-emerald-600 dark:text-emerald-400/80">
                  {status.connectedAt
                    ? `Conectado desde ${new Date(status.connectedAt).toLocaleString('pt-BR')}`
                    : 'Instância ativa via Evolution API'}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowConfig(true)}>
              <Settings className="w-4 h-4" />
              Gerenciar
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl dark:bg-amber-500/10 dark:border-amber-500/20">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-800 dark:text-amber-400">WhatsApp desconectado</h3>
                <p className="text-sm text-amber-600 dark:text-amber-400/80">
                  Conecte para o negócio enviar e receber mensagens pelo WhatsApp automaticamente.
                </p>
              </div>
            </div>
            <Button variant="primary" size="sm" onClick={() => setShowConfig(true)}>
              Ativar WhatsApp
            </Button>
          </div>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        A conexão usa a Evolution API (evo2). Ao ativar, um QR Code é gerado para você escanear com o WhatsApp do
        negócio — a partir daí, agendamentos, lembretes e a lista de espera são enviados automaticamente por lá.
        Conversas e envio manual de mensagens ficam disponíveis na aba{' '}
        <a href="/whatsapp" className="text-primary underline">
          WhatsApp
        </a>
        .
      </p>

      <WhatsAppConfigModal
        isOpen={showConfig}
        onClose={() => {
          setShowConfig(false);
          loadStatus();
        }}
        onStatusChange={loadStatus}
      />
    </div>
  );
}
