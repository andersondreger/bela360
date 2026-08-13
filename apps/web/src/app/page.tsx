'use client';

import { useRef, Fragment } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  CalendarCheck,
  LineChart,
  MessageCircle,
  Sparkles,
  Users,
  Wallet,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Heart,
  Gem,
  Mail,
  MapPin,
  Phone,
} from 'lucide-react';
import { AuroraBackground, GoldDust, Logo, Button, Card } from '@/components/ui';
import { useScrollFilm } from '@/lib/useScrollFilm';

/**
 * Splits a phrase into one <span data-hero-word> per word, for the hero's staggered
 * reveal. `wordClassName` is applied to every word span, not the wrapper, so a
 * gradient bg-clip-text effect still paints correctly (it breaks across nested
 * inline-block boxes if only the parent carries the gradient classes).
 */
function SplitWords({ text, wordClassName }: { text: string; wordClassName?: string }) {
  return (
    <>
      {text.split(' ').map((word, i) => (
        <Fragment key={i}>
          <span data-hero-word className={`inline-block ${wordClassName ?? ''}`}>
            {word}
          </span>{' '}
        </Fragment>
      ))}
    </>
  );
}

const CAPABILITIES = [
  {
    icon: MessageCircle,
    title: 'Agendamento pelo WhatsApp',
    description:
      'Suas clientes marcam, confirmam e remarcam horários direto no WhatsApp, sem precisar instalar nada.',
  },
  {
    icon: CalendarCheck,
    title: 'Agenda inteligente',
    description:
      'Visão por dia, semana ou mês, com bloqueio automático de conflitos e horários por profissional.',
  },
  {
    icon: Users,
    title: 'Clientes e histórico',
    description:
      'Cadastro completo, histórico de atendimentos, aniversariantes e clientes que sumiram.',
  },
  {
    icon: Wallet,
    title: 'Financeiro e comissões',
    description: 'Controle de caixa, pagamentos e comissão de cada profissional em um só lugar.',
  },
  {
    icon: LineChart,
    title: 'Relatórios em tempo real',
    description: 'Receita, serviços mais vendidos e desempenho da equipe sempre à mão.',
  },
  {
    icon: Sparkles,
    title: 'Lembretes automáticos',
    description: 'Menos faltas: lembrete enviado sozinho antes do horário marcado.',
  },
];

const WHY_US = [
  {
    icon: Gem,
    title: 'Feito para o seu nicho',
    description: 'Salões, barbearias, clínicas de estética e spas. Não é um sistema genérico.',
  },
  {
    icon: ShieldCheck,
    title: 'Seus dados protegidos',
    description: 'Cada negócio é isolado no sistema. Ninguém vê dado de outro salão.',
  },
  {
    icon: Zap,
    title: 'Tecnologia de verdade',
    description: 'Automação real rodando no WhatsApp, não uma promessa de roadmap.',
  },
  {
    icon: Heart,
    title: 'Feito para crescer com você',
    description: 'Comece simples e libere marketing, fidelidade e estoque quando precisar.',
  },
];

const GALLERY = [
  { src: '/images/landing/service-color.jpg', label: 'Cabelo e coloração' },
  { src: '/images/landing/service-nails.jpg', label: 'Unhas e manicure' },
  { src: '/images/landing/service-wash.jpg', label: 'Tratamentos e spa' },
];

const STEPS = [
  {
    step: '1',
    title: 'Cadastre seu salão',
    description: 'Leva menos de 2 minutos. Só o nome do negócio e um telefone.',
  },
  {
    step: '2',
    title: 'Conecte seu WhatsApp',
    description: 'Escaneie um QR Code e o bela360 passa a atender por você.',
  },
  {
    step: '3',
    title: 'Comece a receber agendamentos',
    description: 'Sua agenda se organiza sozinha enquanto você cuida do salão.',
  },
];

const NAV_LINKS = [
  { href: '#recursos', label: 'Recursos' },
  { href: '#por-que', label: 'Por que o bela360' },
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#contato', label: 'Contato' },
];

export default function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  useScrollFilm(containerRef);

  return (
    <main ref={containerRef} className="relative overflow-hidden">
      <GoldDust />

      {/* Mirror-wipe: a specular light sweep flashed across the frame as the hero
          cuts to the content below, like light catching a mirror mid-turn. */}
      <div
        data-mirror-wipe
        aria-hidden
        className="pointer-events-none fixed inset-0 z-40 overflow-hidden opacity-0"
      >
        <div
          data-mirror-band
          className="absolute -inset-y-1/4 -left-1/3 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/60 to-transparent blur-md"
        />
      </div>

      {/* Hero */}
      <section id="topo" className="relative flex min-h-screen flex-col overflow-hidden p-4">
        <AuroraBackground />

        <nav
          data-nav
          className="fixed inset-x-0 top-0 z-30 transition-colors duration-300 data-[scrolled=true]:bg-bela-plum/80 data-[scrolled=true]:backdrop-blur-xl data-[scrolled=true]:shadow-lg"
        >
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6">
            <Logo />
            <div className="hidden items-center gap-8 lg:flex">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-white/70 transition hover:text-white"
                >
                  {link.label}
                </a>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm font-medium text-white/80 transition hover:text-white"
              >
                Entrar
              </Link>
              <Link href="/onboarding">
                <Button size="sm">Cadastrar salão grátis</Button>
              </Link>
            </div>
          </div>
        </nav>

        <div className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-center gap-12 pb-16 pt-28 lg:grid-cols-2">
          <div data-hero-exit className="text-center lg:text-left">
            <span
              data-hero-badge
              className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/80"
            >
              <Sparkles className="h-3.5 w-3.5 text-bela-gold" />
              Feito para salões, barbearias e clínicas de estética
            </span>
            <h1 className="font-display text-4xl font-semibold leading-[1.05] text-white sm:text-5xl md:text-6xl">
              <SplitWords text="Automação completa para o seu" />
              <SplitWords
                text="negócio de beleza"
                wordClassName="bg-gradient-to-r from-bela-pink via-bela-violet to-bela-gold bg-clip-text text-transparent italic"
              />
            </h1>
            <p data-hero-copy className="mx-auto mt-6 max-w-xl text-lg text-white/70 lg:mx-0">
              Agenda, clientes, financeiro e atendimento pelo WhatsApp, tudo automatizado em um
              único painel. Menos tempo no caderno, mais tempo com suas clientes.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link href="/onboarding" data-hero-cta>
                <Button size="lg" className="w-full sm:w-auto">
                  Cadastre seu salão grátis
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login" data-hero-cta>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-white/20 text-white hover:bg-white/10 sm:w-auto"
                >
                  Já tenho conta
                </Button>
              </Link>
            </div>
            <p className="mt-6 text-xs text-white/40">
              Sem cartão de crédito. Comece a usar em menos de 2 minutos.
            </p>
          </div>

          <div
            data-hero-exit
            className="relative mx-auto w-full max-w-sm lg:max-w-[380px]"
            style={{ perspective: '1400px' }}
          >
            <div data-hero-parallax className="relative">
              {/* Empower aura: soft gold/violet glow breathing behind Ana, like she's
                  radiating the power the salão gets from the automação. GSAP drives the
                  wrapper's intro/scroll transform; the CSS animation drives the inner
                  element's own transform, so the two never fight over the same property. */}
              <div
                data-hero-aura
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-1/2 -z-10 aspect-square w-[130%]"
              >
                <div className="h-full w-full animate-aura-pulse rounded-full bg-[radial-gradient(circle,rgba(240,180,41,0.45)_0%,rgba(168,85,247,0.3)_45%,transparent_72%)] blur-2xl" />
              </div>
              {/* Power ring: slow-spinning conic halo, the "energy" the aura radiates. */}
              <div
                data-hero-ring
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-1/2 -z-10 aspect-square w-[105%]"
              >
                <div className="h-full w-full animate-spin-slow rounded-full opacity-60 [background:conic-gradient(from_0deg,transparent_0deg,rgba(240,180,41,0.55)_60deg,transparent_140deg,rgba(236,72,153,0.5)_220deg,transparent_320deg)] [mask:radial-gradient(farthest-side,transparent_calc(100%-3px),black_calc(100%-2px))]" />
              </div>

              <div data-hero-image className="relative aspect-[4/5] w-full">
                <Image
                  src="/images/landing/hero-ana.png"
                  alt="Ana, a assistente de IA do bela360, pronta para atender seu salão"
                  fill
                  priority
                  sizes="(max-width: 1024px) 70vw, 380px"
                  className="object-contain object-bottom drop-shadow-[0_25px_45px_rgba(0,0,0,0.5)]"
                />
              </div>
              <div
                data-hero-float
                className="glass-dark noise-overlay absolute -bottom-6 -left-6 hidden rounded-2xl p-4 shadow-2xl sm:block"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand text-white">
                    <CalendarCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Confirmado no WhatsApp</p>
                    <p className="text-xs text-white/60">Sem ligação, sem esquecer</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities / "Recursos" */}
      <section id="recursos" className="relative bg-background py-24">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div data-reveal className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">
              Tudo que o seu salão precisa
            </h2>
            <p className="mt-4 text-muted-foreground">
              Substitua a agenda de papel, os grupos de WhatsApp bagunçados e as planilhas por um
              único sistema que trabalha por você.
            </p>
          </div>

          <div data-reveal-group className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((feature) => (
              <Card key={feature.title} data-reveal-item className="p-6">
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-glow">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why us */}
      <section id="por-que" className="relative overflow-hidden bg-bela-plum py-24">
        <AuroraBackground variant="subtle" />
        <div className="relative mx-auto w-full max-w-6xl px-4">
          <div data-reveal className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold text-white sm:text-4xl">
              Por que escolher o bela360
            </h2>
          </div>

          <div data-reveal-group className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {WHY_US.map((item) => (
              <div key={item.title} data-reveal-item className="glass-dark noise-overlay rounded-2xl p-6 text-center">
                <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-glow">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-white/70">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product preview */}
      <section className="relative bg-background py-24">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div data-reveal className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">
              Um painel, tudo organizado
            </h2>
            <p className="mt-4 text-muted-foreground">
              Agenda, financeiro e conversas em um só lugar, com o visual do bela360.
            </p>
          </div>

          <div data-preview-group className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card data-preview-panel className="overflow-hidden">
              <div className="border-b border-border bg-muted/40 p-4">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Agenda de hoje</span>
                </div>
              </div>
              <div className="space-y-2 p-4">
                {['09:00 · Corte + Escova', '10:30 · Coloração', '14:00 · Manicure'].map((row) => (
                  <div
                    key={row}
                    className="rounded-lg border border-border bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                  >
                    {row}
                  </div>
                ))}
              </div>
            </Card>

            <Card data-preview-panel className="overflow-hidden">
              <div className="border-b border-border bg-muted/40 p-4">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Financeiro do mês</span>
                </div>
              </div>
              <div className="space-y-3 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Receita</span>
                  <span className="font-semibold text-emerald-600">R$ 8.240</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Comissões</span>
                  <span className="font-semibold text-amber-600">R$ 2.470</span>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
                  <span className="text-muted-foreground">Lucro do salão</span>
                  <span className="font-semibold text-primary">R$ 5.770</span>
                </div>
              </div>
            </Card>

            <Card data-preview-panel className="overflow-hidden">
              <div className="border-b border-border bg-muted/40 p-4">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">WhatsApp</span>
                </div>
              </div>
              <div className="space-y-2 p-4 text-xs">
                <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-gradient-brand px-3 py-2 text-white">
                  Seu horário amanhã às 14h está confirmado ✅
                </div>
                <div className="mr-auto max-w-[80%] rounded-2xl rounded-tl-sm bg-muted px-3 py-2">
                  Perfeito, obrigada!
                </div>
              </div>
            </Card>
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Ilustração do painel do bela360. As telas reais do sistema se adaptam ao seu negócio.
          </p>
        </div>
      </section>

      {/* Gallery */}
      <section className="relative bg-muted/30 py-24">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div data-reveal className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">
              Para todo tipo de negócio de beleza
            </h2>
            <p className="mt-4 text-muted-foreground">
              Salão, barbearia, clínica de estética ou spa: o bela360 se adapta ao seu atendimento.
            </p>
          </div>
          <div data-reveal-group className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {GALLERY.map((item) => (
              <div
                key={item.label}
                data-reveal-item
                className="group relative aspect-[3/4] overflow-hidden rounded-2xl shadow-sm"
              >
                <Image
                  src={item.src}
                  alt={item.label}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent" />
                <p className="absolute bottom-4 left-4 text-sm font-semibold text-white">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="relative overflow-hidden bg-bela-plum py-24">
        <AuroraBackground variant="subtle" />
        <div className="relative mx-auto w-full max-w-6xl px-4">
          <div data-reveal className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold text-white sm:text-4xl">
              Comece a usar em 3 passos
            </h2>
          </div>

          <div data-reveal-group className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.step} data-reveal-item className="glass-dark noise-overlay rounded-2xl p-6 text-center">
                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-brand text-sm font-bold text-white">
                  {s.step}
                </div>
                <h3 className="text-base font-semibold text-white">{s.title}</h3>
                <p className="mt-2 text-sm text-white/70">{s.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 flex justify-center">
            <Link href="/onboarding">
              <Button size="lg">
                Cadastrar meu salão agora
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-t border-border bg-background py-16">
        <div
          data-reveal-group
          className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 px-4 text-center sm:flex-row sm:justify-between sm:text-left"
        >
          {[
            'Atendimento automático 24h por dia',
            'Sem instalar nada, direto do WhatsApp',
            'Seus dados protegidos, sempre',
          ].map((item) => (
            <div key={item} data-reveal-item className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-bela-violet" />
              {item}
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section id="contato" className="relative overflow-hidden bg-background py-24">
        <div data-reveal className="mx-auto w-full max-w-4xl px-4 text-center">
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">
            Pronta para automatizar seu salão?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Cadastre seu negócio agora e comece a atender pelo WhatsApp ainda hoje.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/onboarding">
              <Button size="lg" className="w-full sm:w-auto">
                Cadastre seu salão grátis
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="https://t.me/Bela360bot" target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Falar com a gente no Telegram
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-12">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Logo mark={true} />
              <p className="mt-4 text-sm text-muted-foreground">
                Automação completa para salões, barbearias e clínicas de estética.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold">Navegação</h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} className="transition hover:text-foreground">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold">Acesso</h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/login" className="transition hover:text-foreground">
                    Entrar
                  </Link>
                </li>
                <li>
                  <Link href="/onboarding" className="transition hover:text-foreground">
                    Cadastrar salão
                  </Link>
                </li>
                <li>
                  <Link href="/profissional" className="transition hover:text-foreground">
                    Entrar como profissional
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold">Contato</h3>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-bela-violet" />
                  <span>Rua Tiradentes, Matelândia, PR</span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-bela-violet" />
                  <a href="tel:+554591397543" className="transition hover:text-foreground">
                    (45) 9 9139-7543
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-bela-violet" />
                  <a
                    href="mailto:atendimento@wayia.com.br"
                    className="transition hover:text-foreground"
                  >
                    atendimento@wayia.com.br
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-xs text-muted-foreground sm:flex-row">
            <p>© {new Date().getFullYear()} bela360. Todos os direitos reservados.</p>
            <p>Feito pelo ecossistema WayIA.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
