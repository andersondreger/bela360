'use client';

import { FormEvent, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Sparkles, ArrowLeft, ArrowRight, Store, User } from 'lucide-react';
import { AuroraBackground, Logo, Button, Input, Select } from '@/components/ui';
import { cn } from '@/lib/utils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

const BUSINESS_TYPES = [
  { value: 'SALON', label: 'Salão de beleza' },
  { value: 'BARBERSHOP', label: 'Barbearia' },
  { value: 'AESTHETICS', label: 'Clínica de estética' },
  { value: 'SPA', label: 'Spa' },
  { value: 'OTHER', label: 'Outro' },
];

const STEPS = [
  { id: 1, label: 'Seu salão' },
  { id: 2, label: 'Você' },
  { id: 3, label: 'Pronto' },
];

function formatPhone(value: string) {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
}

function StepDots({ current }: { current: number }) {
  return (
    <div className="mb-8 flex items-center justify-center gap-2">
      {STEPS.map((s, i) => (
        <div key={s.id} className="flex items-center gap-2">
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors',
              current > s.id
                ? 'bg-emerald-500 text-white'
                : current === s.id
                ? 'bg-gradient-brand text-white shadow-glow'
                : 'bg-white/10 text-white/50'
            )}
          >
            {current > s.id ? <CheckCircle2 className="h-4 w-4" /> : s.id}
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                'h-0.5 w-8 rounded transition-colors sm:w-14',
                current > s.id ? 'bg-emerald-500' : 'bg-white/10'
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '',
    type: 'SALON',
    phone: '',
    ownerName: '',
    ownerPhone: '',
    ownerEmail: '',
    city: '',
    state: '',
  });
  const [sameAsBusinessPhone, setSameAsBusinessPhone] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const raw = e.target.value;
    const value = field === 'phone' || field === 'ownerPhone' ? formatPhone(raw) : raw;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const step1Valid = form.name.trim().length >= 2 && form.phone.replace(/\D/g, '').length >= 10;
  const step2Valid =
    form.ownerName.trim().length >= 2 &&
    (sameAsBusinessPhone || form.ownerPhone.replace(/\D/g, '').length >= 10);

  const goNext = () => {
    setError('');
    setStep((s) => Math.min(s + 1, 3));
  };

  const goBack = () => {
    setError('');
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!step2Valid) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/public/business/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          phone: form.phone.replace(/\D/g, ''),
          ownerName: form.ownerName,
          ownerPhone: sameAsBusinessPhone ? form.phone.replace(/\D/g, '') : form.ownerPhone.replace(/\D/g, ''),
          ownerEmail: form.ownerEmail || undefined,
          city: form.city || undefined,
          state: form.state ? form.state.toUpperCase() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Não foi possível concluir o cadastro');
      }

      setDone(true);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível concluir o cadastro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-4 py-12">
      <AuroraBackground />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-xl"
      >
        <div className="mb-8 text-center">
          <a href="/" className="mb-4 flex justify-center">
            <Logo wordmarkClassName="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-bela-gold" />
          </a>
          <p className="flex items-center justify-center gap-1.5 text-sm text-white/70">
            <Sparkles className="h-3.5 w-3.5 text-bela-gold" />
            Comece a automatizar seu salão em 2 minutos
          </p>
        </div>

        <StepDots current={step} />

        <div className="glass-dark noise-overlay rounded-3xl p-8 shadow-2xl">
          <AnimatePresence mode="wait">
            {done ? (
              <motion.div
                key="done"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-6 text-center"
              >
                <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-emerald-400" />
                <h2 className="text-xl font-semibold text-white">Salão cadastrado!</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm text-white/70">
                  Enviamos as próximas instruções por WhatsApp para{' '}
                  <span className="font-medium text-white">
                    {sameAsBusinessPhone ? form.phone : form.ownerPhone}
                  </span>
                  . Use esse número para entrar na sua conta.
                </p>
                <Button className="mt-6 w-full" size="lg" onClick={() => (window.location.href = '/login')}>
                  Ir para o login
                </Button>
              </motion.div>
            ) : step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mb-6 flex items-center gap-2">
                  <Store className="h-5 w-5 text-bela-gold" />
                  <h2 className="text-xl font-semibold text-white">Dados do salão</h2>
                </div>
                <div className="space-y-4">
                  <Input
                    label="Nome do salão"
                    value={form.name}
                    onChange={update('name')}
                    placeholder="Salão Bela Vita"
                    required
                    minLength={2}
                    autoFocus
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Select label="Tipo de negócio" value={form.type} onChange={update('type')}>
                      {BUSINESS_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </Select>
                    <Input
                      label="Telefone do salão"
                      type="tel"
                      value={form.phone}
                      onChange={update('phone')}
                      placeholder="(11) 99999-9999"
                      maxLength={15}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Cidade" value={form.city} onChange={update('city')} placeholder="São Paulo" />
                    <Input label="UF" value={form.state} onChange={update('state')} placeholder="SP" maxLength={2} />
                  </div>
                </div>

                <Button className="mt-6 w-full" size="lg" disabled={!step1Valid} onClick={goNext}>
                  Continuar
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </motion.div>
            ) : (
              <motion.form
                key="step2"
                onSubmit={handleSubmit}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mb-6 flex items-center gap-2">
                  <User className="h-5 w-5 text-bela-gold" />
                  <h2 className="text-xl font-semibold text-white">Dados do responsável</h2>
                </div>

                <div className="space-y-4">
                  <Input
                    label="Seu nome"
                    value={form.ownerName}
                    onChange={update('ownerName')}
                    placeholder="Como você se chama"
                    required
                    minLength={2}
                    autoFocus
                  />

                  <Input
                    label="Seu e-mail (opcional)"
                    type="email"
                    value={form.ownerEmail}
                    onChange={update('ownerEmail')}
                    placeholder="voce@email.com"
                  />

                  <label className="flex items-center gap-2 text-sm text-white/70">
                    <input
                      type="checkbox"
                      checked={sameAsBusinessPhone}
                      onChange={(e) => setSameAsBusinessPhone(e.target.checked)}
                      className="h-4 w-4 rounded border-white/30 bg-transparent"
                    />
                    Uso o mesmo telefone do salão para entrar
                  </label>

                  {!sameAsBusinessPhone && (
                    <Input
                      label="Seu telefone (login)"
                      type="tel"
                      value={form.ownerPhone}
                      onChange={update('ownerPhone')}
                      placeholder="(11) 99999-9999"
                      maxLength={15}
                      required
                    />
                  )}
                </div>

                {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

                <div className="mt-6 flex gap-3">
                  <Button type="button" variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={goBack} disabled={loading}>
                    <ArrowLeft className="h-4 w-4" />
                    Voltar
                  </Button>
                  <Button type="submit" className="flex-1" size="lg" loading={loading} disabled={!step2Valid}>
                    Criar meu salão
                  </Button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {!done && (
          <p className="relative mt-6 text-center text-sm text-white/70">
            Já tem uma conta?{' '}
            <a href="/login" className="font-semibold text-white hover:underline">
              Entrar
            </a>
          </p>
        )}
      </motion.div>
    </main>
  );
}
