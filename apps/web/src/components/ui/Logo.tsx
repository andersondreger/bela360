import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  mark?: boolean;
  wordmarkClassName?: string;
}

// Source badge is 846x800px (trimmed, transparent) — kept at native ratio so
// it never looks squished at any display height.
const MARK_RATIO = 846 / 800;

export function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src="/images/logobela360.png"
      alt="Bela 360°"
      width={846}
      height={800}
      priority
      className={cn('h-12 w-auto', className)}
      style={{ aspectRatio: MARK_RATIO }}
    />
  );
}

export function Logo({ className, mark = true }: LogoProps) {
  return (
    <div className={cn('flex items-center', className)}>
      {mark && <LogoMark />}
    </div>
  );
}
