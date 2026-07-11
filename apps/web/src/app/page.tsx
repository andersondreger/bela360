'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { AuroraBackground, Logo, OtpLoginForm } from '@/components/ui';
import { fetchCurrentUser, getStoredRole, homePathForRole } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;

    fetchCurrentUser().then((user) => {
      if (!active) return;
      if (user) {
        router.replace(homePathForRole(getStoredRole() ?? user.role));
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
          <div className="mb-4 flex justify-center">
            <Logo wordmarkClassName="text-white bg-none text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-bela-gold" />
          </div>
          <p className="flex items-center justify-center gap-1.5 text-sm text-white/70">
            <Sparkles className="h-3.5 w-3.5 text-bela-gold" />
            Automação inteligente para o seu salão
          </p>
        </div>

        <div className="glass-dark noise-overlay rounded-3xl p-8 shadow-2xl">
          <h2 className="mb-6 text-xl font-semibold text-white">Entrar na sua conta</h2>
          <OtpLoginForm
            onVerified={(data) => {
              localStorage.setItem('accessToken', data.accessToken);
              localStorage.setItem('refreshToken', data.refreshToken);
              localStorage.setItem('userRole', data.user.role);
              router.push(homePathForRole(data.user.role));
            }}
          />
        </div>

        <p className="relative mt-8 text-center text-sm text-white/70">
          Novo por aqui?{' '}
          <a href="/onboarding" className="font-semibold text-white hover:underline">
            Cadastre seu salão
          </a>
        </p>
        <p className="relative mt-2 text-center text-xs text-white/50">
          É um profissional?{' '}
          <a href="/profissional" className="font-medium text-white/80 hover:underline">
            Entrar como profissional
          </a>
        </p>
      </motion.div>
    </main>
  );
}
