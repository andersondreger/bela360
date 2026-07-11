'use client';

import { cn } from '@/lib/utils';

interface AuroraBackgroundProps {
  className?: string;
  variant?: 'vivid' | 'subtle';
}

/**
 * Fully generated (no external images) animated gradient-mesh background.
 * `vivid` = full-bleed hero use (login/onboarding). `subtle` = faint wash behind app shells.
 */
export function AuroraBackground({ className, variant = 'vivid' }: AuroraBackgroundProps) {
  const opacity = variant === 'vivid' ? 1 : 0.35;

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        variant === 'vivid' ? 'bg-bela-plum' : 'bg-transparent',
        className
      )}
      style={{ opacity: variant === 'subtle' ? opacity : undefined }}
    >
      <div className="absolute -top-32 -left-24 h-[32rem] w-[32rem] rounded-full bg-bela-purple/60 blur-[110px] animate-blob" />
      <div className="absolute top-1/3 -right-32 h-[28rem] w-[28rem] rounded-full bg-bela-rose/55 blur-[110px] animate-blob [animation-delay:4s]" />
      <div className="absolute bottom-[-10rem] left-1/4 h-[30rem] w-[30rem] rounded-full bg-bela-gold/40 blur-[120px] animate-blob [animation-delay:8s]" />
      <div className="absolute bottom-0 right-1/4 h-[24rem] w-[24rem] rounded-full bg-fuchsia-500/40 blur-[100px] animate-blob [animation-delay:12s]" />
      <div className="noise-overlay absolute inset-0" />
    </div>
  );
}
