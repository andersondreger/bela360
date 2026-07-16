import Link from 'next/link';
import {
  CalendarCheck,
  LineChart,
  MessageCircle,
  Sparkles,
  Users,
  Wallet,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { AuroraBackground, Logo, Button, Card } from '@/components/ui';

const FEATURES = [
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
    description: 'Menos faltas: lembrete de 24h e 2h antes do horário, enviado sozinho.',
  },
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

export default function HomePage() {
  return (
    <main className="relative overflow-hidden">
      {/* Hero */}
      <section className="relative flex min-h-screen flex-col overflow-hidden p-4">
        <AuroraBackground />

        <nav className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between py-6">
          <Logo wordmarkClassName="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-bela-gold" />
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
        </nav>

        <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center py-16 text-center">
          <span className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/80">
            <Sparkles className="h-3.5 w-3.5 text-bela-gold" />
            Feito para salões, barbearias e clínicas de estética
          </span>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl">
            Automação completa para o seu{' '}
            <span className="bg-gradient-to-r from-bela-pink via-bela-violet to-bela-gold bg-clip-text text-transparent">
              negócio de beleza
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-white/70">
            Agenda, clientes, financeiro e atendimento pelo WhatsApp, tudo automatizado em um
            único painel. Menos tempo no caderno, mais tempo com suas clientes.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/onboarding">
              <Button size="lg" className="w-full sm:w-auto">
                Cadastre seu salão grátis
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="w-full border-white/20 text-white hover:bg-white/10 sm:w-auto">
                Já tenho conta
              </Button>
            </Link>
          </div>
          <p className="mt-6 text-xs text-white/40">
            Sem cartão de crédito. Comece a usar em menos de 2 minutos.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="relative bg-background py-24">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Tudo que o seu salão precisa</h2>
            <p className="mt-4 text-muted-foreground">
              Substitua a agenda de papel, os grupos de WhatsApp bagunçados e as planilhas por um
              único sistema que trabalha por você.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <Card key={feature.title} className="p-6">
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

      {/* How it works */}
      <section className="relative overflow-hidden bg-bela-plum py-24">
        <AuroraBackground variant="subtle" />
        <div className="relative mx-auto w-full max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Comece a usar em 3 passos
            </h2>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.step} className="glass-dark noise-overlay rounded-2xl p-6 text-center">
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
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 px-4 text-center sm:flex-row sm:justify-between sm:text-left">
          {[
            'Atendimento automático 24h por dia',
            'Sem instalar nada, direto do WhatsApp',
            'Seus dados protegidos, sempre',
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-bela-violet" />
              {item}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row">
          <Logo mark={false} wordmarkClassName="text-foreground" />
          <p>© {new Date().getFullYear()} bela360. Todos os direitos reservados.</p>
        </div>
      </footer>
    </main>
  );
}
