'use client';

import { FormEvent, useState } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, Phone } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';

interface VerifiedPayload {
  accessToken: string;
  refreshToken: string;
  user: { id: string; name: string; phone: string; email: string | null; role: string };
  business: { id: string; name: string; slug: string; type: string; whatsappConnected: boolean };
}

interface OtpLoginFormProps {
  /** Called after a successful OTP verification. Throw an Error to surface a message and stay on the OTP step. */
  onVerified: (data: VerifiedPayload) => void | Promise<void>;
}

function formatPhone(value: string) {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
}

export function OtpLoginForm({ onVerified }: OtpLoginFormProps) {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestOTP = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.replace(/\D/g, '') }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Erro ao enviar código');

      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar código');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.replace(/\D/g, ''), otp }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error?.message || 'Código inválido');

      await onVerified(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Código inválido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
      {step === 'phone' ? (
        <form onSubmit={handleRequestOTP} className="space-y-4">
          <Input
            label="Telefone (WhatsApp)"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            placeholder="(11) 99999-9999"
            maxLength={15}
            required
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            loading={loading}
            disabled={phone.replace(/\D/g, '').length < 10}
          >
            <Phone className="h-4 w-4" />
            Enviar código
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOTP} className="space-y-4">
          <p className="text-sm text-muted-foreground">Enviamos um código para {phone}</p>
          <Input
            label="Código de 6 dígitos"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="text-center text-2xl tracking-[0.5em]"
            maxLength={6}
            required
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" size="lg" loading={loading} disabled={otp.length !== 6}>
            <KeyRound className="h-4 w-4" />
            Entrar
          </Button>
          <button
            type="button"
            onClick={() => {
              setStep('phone');
              setOtp('');
              setError('');
            }}
            className="w-full text-center text-sm font-medium text-primary hover:underline"
          >
            Usar outro número
          </button>
        </form>
      )}
    </motion.div>
  );
}
