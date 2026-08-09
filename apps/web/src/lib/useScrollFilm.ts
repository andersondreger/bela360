'use client';

import { RefObject } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Drives the whole "scroll-film" choreography for the landing page: Lenis
 * momentum scroll, a one-shot hero intro, a scrub-tied hero exit, and a
 * generic reveal-on-enter/reverse-on-leave pass over every section so
 * content keeps forming in and leaving as the visitor scrolls.
 *
 * Everything is scoped to `containerRef` via useGSAP so it reverts cleanly
 * on unmount, and bails out entirely under prefers-reduced-motion.
 */
export function useScrollFilm(containerRef: RefObject<HTMLElement>) {
  useGSAP(
    () => {
      const root = containerRef.current;
      if (!root) return;

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }

      const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
      lenis.on('scroll', ScrollTrigger.update);

      const tickerCallback = (time: number) => {
        lenis.raf(time * 1000);
      };
      gsap.ticker.add(tickerCallback);
      gsap.ticker.lagSmoothing(0);

      const anchors = Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'));
      const handleAnchorClick = (e: Event) => {
        const href = (e.currentTarget as HTMLAnchorElement).getAttribute('href');
        if (!href || href.length < 2) return;
        const target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target as HTMLElement, { offset: -16 });
      };
      anchors.forEach((a) => a.addEventListener('click', handleAnchorClick));

      const onLoad = () => ScrollTrigger.refresh();
      window.addEventListener('load', onLoad);

      // ---- Hero: one-shot intro on load ----
      const heroTl = gsap.timeline({ delay: 0.15 });
      heroTl
        .from('[data-hero-badge]', { opacity: 0, y: -14, duration: 0.6, ease: 'power3.out' })
        .from(
          '[data-hero-word]',
          {
            opacity: 0,
            y: 36,
            rotateX: -50,
            transformPerspective: 500,
            transformOrigin: '50% 100%',
            duration: 0.7,
            stagger: 0.035,
            ease: 'power3.out',
          },
          '-=0.3'
        )
        .from('[data-hero-copy]', { opacity: 0, y: 18, duration: 0.6, ease: 'power3.out' }, '-=0.45')
        .from(
          '[data-hero-cta]',
          { opacity: 0, y: 18, duration: 0.5, stagger: 0.08, ease: 'power3.out' },
          '-=0.4'
        )
        .from(
          '[data-hero-image]',
          {
            opacity: 0,
            scale: 1.08,
            clipPath: 'inset(0% 0% 100% 0%)',
            duration: 1.1,
            ease: 'power4.out',
          },
          '-=0.85'
        )
        .from(
          '[data-hero-float]',
          { opacity: 0, y: 20, scale: 0.9, duration: 0.5, ease: 'back.out(1.7)' },
          '-=0.35'
        );

      // ---- Hero: scrub-tied exit as the next scene rises ----
      // (opacity/y/scale only: transform+opacity stay GPU-composited, unlike
      // filter/blur, which forces a repaint every scrub tick and is a common
      // source of scroll jank.)
      const heroSection = root.querySelector('#topo');
      if (heroSection) {
        gsap.to('[data-hero-exit]', {
          opacity: 0,
          y: -56,
          scale: 0.97,
          ease: 'none',
          scrollTrigger: {
            trigger: heroSection,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
          },
        });
      }

      // ---- Hero image: mirror-tilt parallax as the visitor scrolls past ----
      if (heroSection) {
        gsap.to('[data-hero-parallax]', {
          rotateY: -9,
          rotateX: 3,
          scale: 1.05,
          ease: 'none',
          scrollTrigger: {
            trigger: heroSection,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
          },
        });
      }

      // ---- Aurora glow: each section's glow layer drifts at its own depth ----
      root.querySelectorAll<HTMLElement>('[data-aurora-parallax]').forEach((layer) => {
        const section = layer.closest('section');
        if (!section) return;
        gsap.to(layer, {
          yPercent: 16,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        });
      });

      // ---- Mirror-wipe: a specular light sweep flashes as the hero cuts to content ----
      const mirrorWipe = root.querySelector('[data-mirror-wipe]');
      const mirrorBand = root.querySelector('[data-mirror-band]');
      if (mirrorWipe && mirrorBand && heroSection) {
        gsap
          .timeline({
            scrollTrigger: {
              trigger: heroSection,
              start: 'bottom bottom',
              end: 'bottom top',
              scrub: true,
            },
          })
          .fromTo(mirrorBand, { xPercent: -150 }, { xPercent: 250, ease: 'none' }, 0)
          .fromTo(mirrorWipe, { opacity: 0 }, { opacity: 1, ease: 'none' }, 0)
          .to(mirrorWipe, { opacity: 0, ease: 'none' }, 0.55);
      }

      // ---- Nav: solidify once the hero has scrolled past ----
      const navEl = root.querySelector('[data-nav]');
      if (navEl && heroSection) {
        ScrollTrigger.create({
          trigger: heroSection,
          start: 'bottom top+=80',
          onEnter: () => navEl.setAttribute('data-scrolled', 'true'),
          onLeaveBack: () => navEl.removeAttribute('data-scrolled'),
        });
      }

      // ---- Generic single-element reveal (section headers, captions) ----
      root.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 44,
          scale: 0.96,
          duration: 0.75,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            toggleActions: 'play reverse play reverse',
          },
        });
      });

      // ---- Grouped staggered reveal (card grids) ----
      // rotateX+transformPerspective gives each card a slight "catching the light"
      // tilt as it settles in, instead of a flat fade — keeps the mirror motif going
      // past the hero without touching the aurora/gold-dust layers.
      root.querySelectorAll<HTMLElement>('[data-reveal-group]').forEach((group) => {
        const items = group.querySelectorAll<HTMLElement>('[data-reveal-item]');
        if (!items.length) return;
        gsap.from(items, {
          opacity: 0,
          y: 52,
          scale: 0.95,
          rotateX: 8,
          transformPerspective: 800,
          transformOrigin: '50% 100%',
          duration: 0.7,
          stagger: 0.12,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: group,
            start: 'top 82%',
            toggleActions: 'play reverse play reverse',
          },
        });
      });

      // ---- Product preview: panels assemble left to right ----
      const previewGroup = root.querySelector('[data-preview-group]');
      if (previewGroup) {
        const panels = previewGroup.querySelectorAll('[data-preview-panel]');
        gsap.from(panels, {
          opacity: 0,
          x: -40,
          duration: 0.7,
          stagger: 0.18,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: previewGroup,
            start: 'top 80%',
            toggleActions: 'play reverse play reverse',
          },
        });
      }

      return () => {
        window.removeEventListener('load', onLoad);
        anchors.forEach((a) => a.removeEventListener('click', handleAnchorClick));
        gsap.ticker.remove(tickerCallback);
        lenis.destroy();
      };
    },
    { scope: containerRef }
  );
}
