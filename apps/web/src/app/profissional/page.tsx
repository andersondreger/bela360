'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { UserCircle2 } from 'lucide-react';
import { AuroraBackground, OtpLoginForm } from '@/components/ui';
import { fetchCurrentUser } from '@/lib/auth';

export default function ProfessionalLoginPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;
    fetchCurrentUser().then((user) => {
      if (!active) return;
      if (user && user.role === 'PROFESSIONAL') {
        router.replace('/profissional/meu-painel');
      } else {
        setCheckingSession(false);
      }
    });
    return () => {
      active = false;
    };
  }, [router]);

  if (checkingSession) {
    return (
      <main className="relative flex min-h-screen items-center justify-center bg-bela-plum">
        <AuroraBackground />
        <div className="relative h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <AuroraBackground />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
            <UserCircle2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="mb-1 text-2xl font-bold text-white">Área do Profissional</h1>
          <p className="text-sm text-white/70">Acesse sua agenda e comissões</p>
        </div>

        <div className="glass-dark noise-overlay rounded-3xl p-8 shadow-2xl">
          <h2 className="mb-6 text-xl font-semibold text-white">Entrar como profissional</h2>
          <OtpLoginForm
            onVerified={(data) => {
              if (data.user.role !== 'PROFESSIONAL') {
                throw new Error('Esta área é exclusiva para profissionais');
              }
              localStorage.setItem('accessToken', data.accessToken);
              localStorage.setItem('refreshToken', data.refreshToken);
              localStorage.setItem('userRole', data.user.role);
              router.push('/profissional/meu-painel');
            }}
          />
        </div>

        <div className="relative mt-8 space-y-3 text-center">
          <p className="text-sm text-white/70">
            É dono do negócio?{' '}
            <a href="/" className="font-semibold text-white hover:underline">
              Acesse aqui
            </a>
          </p>
          <p className="text-xs text-white/40">Seu acesso deve ser criado pelo administrador do salão</p>
        </div>
      </motion.div>
    </main>
  );
}
