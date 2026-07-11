import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  mark?: boolean;
  wordmarkClassName?: string;
}

/**
 * Custom SVG mark: a stylized six-petal bloom built from overlapping gradient
 * ellipses (no external image assets, doubles as favicon/app-icon source).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-9 w-9', className)}
    >
      <defs>
        <linearGradient id="bela-mark-a" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A855F7" />
          <stop offset="1" stopColor="#EC4899" />
        </linearGradient>
        <linearGradient id="bela-mark-b" x1="48" y1="0" x2="0" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F0B429" />
          <stop offset="1" stopColor="#EC4899" />
        </linearGradient>
      </defs>
      <g opacity="0.95">
        <ellipse cx="24" cy="13" rx="8" ry="12" fill="url(#bela-mark-a)" transform="rotate(0 24 24)" />
        <ellipse cx="24" cy="13" rx="8" ry="12" fill="url(#bela-mark-b)" opacity="0.85" transform="rotate(60 24 24)" />
        <ellipse cx="24" cy="13" rx="8" ry="12" fill="url(#bela-mark-a)" opacity="0.85" transform="rotate(120 24 24)" />
        <ellipse cx="24" cy="13" rx="8" ry="12" fill="url(#bela-mark-b)" opacity="0.85" transform="rotate(180 24 24)" />
        <ellipse cx="24" cy="13" rx="8" ry="12" fill="url(#bela-mark-a)" opacity="0.85" transform="rotate(240 24 24)" />
        <ellipse cx="24" cy="13" rx="8" ry="12" fill="url(#bela-mark-b)" opacity="0.85" transform="rotate(300 24 24)" />
      </g>
      <circle cx="24" cy="24" r="5" fill="white" fillOpacity="0.95" />
    </svg>
  );
}

export function Logo({ className, mark = true, wordmarkClassName }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      {mark && <LogoMark />}
      <span className={cn('text-2xl font-bold tracking-tight text-gradient', wordmarkClassName)}>
        bela360
      </span>
    </div>
  );
}
