'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bela-plum p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-card p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/15 text-red-500">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h1 className="text-lg font-semibold text-foreground">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ocorreu um erro inesperado nesta página. Tente novamente ou recarregue a página.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => reset()}
            className="flex-1 rounded-xl bg-gradient-brand px-4 py-2.5 text-sm font-medium text-white shadow-glow hover:brightness-110"
          >
            Tentar novamente
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
          >
            Recarregar página
          </button>
        </div>
      </div>
    </div>
  );
}
