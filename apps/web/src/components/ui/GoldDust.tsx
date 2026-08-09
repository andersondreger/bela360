'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  r: number;
  driftX: number;
  driftY: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

const GOLD = '240, 180, 41';
const ROSE = '240, 67, 156';

/**
 * Ambient full-viewport canvas of drifting gold/rose flecks — the "light in the mirror"
 * layer that ties the hero, aurora and CTA sections together as one continuous shot.
 * Density stays fixed but brightness ramps up near the page bottom (final CTA) so the
 * dust reads as converging light rather than a static overlay. Pure rAF, no scroll
 * listeners tied to GSAP so it never fights the pinned/scrubbed timelines.
 */
export function GoldDust() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let particles: Particle[] = [];
    let rafId = 0;
    let docHeight = document.documentElement.scrollHeight;

    const density = width < 768 ? 0.00006 : 0.00009;

    const makeParticle = (): Particle => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 0.6 + Math.random() * 1.8,
      driftX: (Math.random() - 0.5) * 0.12,
      driftY: -(0.05 + Math.random() * 0.18),
      baseAlpha: 0.15 + Math.random() * 0.35,
      twinkleSpeed: 0.4 + Math.random() * 0.8,
      twinklePhase: Math.random() * Math.PI * 2,
    });

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      docHeight = document.documentElement.scrollHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.round(width * height * density);
      particles = Array.from({ length: count }, makeParticle);
    };

    resize();
    window.addEventListener('resize', resize);

    let t = 0;
    const draw = () => {
      t += 0.016;
      ctx.clearRect(0, 0, width, height);

      const scrollFraction =
        docHeight > height ? window.scrollY / (docHeight - height) : 0;
      const convergence = Math.max(0, Math.min(1, (scrollFraction - 0.75) / 0.25));

      for (const p of particles) {
        p.x += p.driftX;
        p.y += p.driftY * (1 + convergence * 1.4);

        if (p.y < -10) p.y = height + 10;
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        const twinkle = 0.5 + 0.5 * Math.sin(t * p.twinkleSpeed + p.twinklePhase);
        const alpha = p.baseAlpha * (0.4 + 0.6 * twinkle) * (1 + convergence * 0.8);
        const color = p.r > 1.6 ? ROSE : GOLD;

        ctx.beginPath();
        ctx.fillStyle = `rgba(${color}, ${Math.min(alpha, 1)})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[5] mix-blend-screen"
    />
  );
}
