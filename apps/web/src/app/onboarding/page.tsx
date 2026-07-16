'use client';

import { FormEvent, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { AuroraBackground, Logo, Button, Input, Select } from '@/components/ui';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

const BUSINESS_TYPES = [
  { value: 'SALON', label: 'Salão de beleza' },
  { value: 'BARBERSHOP', label: 'Barbearia' },
  { value: 'AESTHETICS', label: 'Clínica de estética' },
  { value: 'SPA', label: 'Spa' },
  { value: 'OTHER', label: 'Outro' },
];

function formatPhone(value: string) {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
}

export default function OnboardingPage() {
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
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
          <div className="mb-4 flex justify-center">
            <Logo wordmarkClassName="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-bela-gold" />
          </div>
          <p className="flex items-center justify-center gap-1.5 text-sm text-white/70">
            <Sparkles className="h-3.5 w-3.5 text-bela-gold" />
            Comece a automatizar seu salão em 2 minutos
          </p>
        </div>

        <div className="glass-dark noise-overlay rounded-3xl p-8 shadow-2xl">
          {done ? (
            <div className="py-6 text-center">
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
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="mb-2 text-xl font-semibold text-white">Dados do salão</h2>

              <Input
                label="Nome do salão"
                value={form.name}
                onChange={update('name')}
                placeholder="Salão Bela Vita"
                required
                minLength={2}
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

              <div className="border-t border-white/10 pt-4">
                <h3 className="mb-3 text-sm font-semibold text-white">Dados do responsável</h3>
                <Input
                  label="Seu nome"
                  value={form.ownerName}
                  onChange={update('ownerName')}
                  placeholder="Como você se chama"
                  required
                  minLength={2}
                />

                <label className="mt-3 flex items-center gap-2 text-sm text-white/70">
                  <input
                    type="checkbox"
                    checked={sameAsBusinessPhone}
                    onChange={(e) => setSameAsBusinessPhone(e.target.checked)}
                    className="h-4 w-4 rounded border-white/30 bg-transparent"
                  />
                  Uso o mesmo telefone do salão para entrar
                </label>

                {!sameAsBusinessPhone && (
                  <div className="mt-3">
                    <Input
                      label="Seu telefone (login)"
                      type="tel"
                      value={form.ownerPhone}
                      onChange={update('ownerPhone')}
                      placeholder="(11) 99999-9999"
                      maxLength={15}
                      required
                    />
                  </div>
                )}
              </div>

              {error && <p className="text-sm text-destructive-foreground text-red-300">{error}</p>}

              <Button type="submit" className="w-full" size="lg" loading={loading}>
                Criar meu salão
              </Button>
            </form>
          )}
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
