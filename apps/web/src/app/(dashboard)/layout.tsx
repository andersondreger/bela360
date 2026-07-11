'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Scissors,
  Clock,
  Heart,
  Package,
  Wallet,
  Megaphone,
  Zap,
  MessageCircle,
  BarChart3,
  UserCircle,
  Settings,
  LogOut,
} from 'lucide-react';
import { AuroraBackground, Logo } from '@/components/ui';
import { fetchCurrentUser, logout, type CurrentUser } from '@/lib/auth';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Agenda', href: '/agenda', icon: Calendar },
  { name: 'Clientes', href: '/clientes', icon: Users },
  { name: 'Serviços', href: '/servicos', icon: Scissors },
  { name: 'Lista de Espera', href: '/lista-espera', icon: Clock },
  { name: 'Fidelidade', href: '/fidelidade', icon: Heart },
  { name: 'Estoque', href: '/estoque', icon: Package },
  { name: 'Financeiro', href: '/financeiro', icon: Wallet },
  { name: 'Marketing', href: '/marketing', icon: Megaphone },
  { name: 'Automação', href: '/automacao', icon: Zap },
  { name: 'WhatsApp', href: '/whatsapp', icon: MessageCircle },
  { name: 'Analíticos', href: '/analiticos', icon: BarChart3 },
  { name: 'Meu Perfil', href: '/perfil', icon: UserCircle },
  { name: 'Configurações', href: '/configuracoes', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    fetchCurrentUser().then((current) => {
      if (!active) return;
      if (!current) {
        router.replace('/');
        return;
      }
      setUser(current);
      setChecking(false);
    });
    return () => {
      active = false;
    };
  }, [router]);

  if (checking || !user) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-bela-plum">
        <AuroraBackground variant="subtle" className="opacity-60" />
        <div className="relative h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    );
  }

  const initials = user.name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  const currentPage = navigation.find((item) => pathname.startsWith(item.href));

  return (
    <div className="relative min-h-screen bg-background">
      <AuroraBackground variant="subtle" className="fixed" />

      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 w-64 border-r border-border/60 bg-card/80 backdrop-blur-xl">
        <div className="flex h-16 items-center px-6">
          <Logo />
        </div>
        <nav className="space-y-1 overflow-y-auto p-4" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gradient-brand text-white shadow-glow'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className={`mr-3 h-4.5 w-4.5 ${isActive ? 'text-white' : 'text-muted-foreground'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="relative pl-64">
        <header className="flex h-16 items-center justify-between border-b border-border/60 bg-card/70 px-8 backdrop-blur-xl">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{currentPage?.name || 'Dashboard'}</h2>
            <p className="text-xs text-muted-foreground">{user.business.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-brand text-sm font-semibold text-white">
              {initials}
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{user.name}</p>
              <p className="text-xs text-muted-foreground leading-tight">{user.role === 'OWNER' ? 'Proprietário(a)' : user.role}</p>
            </div>
            <button
              onClick={() => logout()}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </header>
        <main className="relative p-8">{children}</main>
      </div>
    </div>
  );
}
