'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Calendar, DollarSign, TrendingUp, LogOut, Menu, X } from 'lucide-react';
import { AuroraBackground, Logo } from '@/components/ui';
import { fetchCurrentUser, getStoredRole, logout, type CurrentUser } from '@/lib/auth';

const navigation = [
  { name: 'Meu Painel', href: '/profissional/meu-painel', icon: TrendingUp },
  { name: 'Minha Agenda', href: '/profissional/agenda', icon: Calendar },
  { name: 'Comissões', href: '/profissional/comissoes', icon: DollarSign },
];

export default function ProfessionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    if (getStoredRole() !== 'PROFESSIONAL') {
      router.replace('/profissional');
      return;
    }

    fetchCurrentUser().then((current) => {
      if (!active) return;
      if (!current || current.role !== 'PROFESSIONAL') {
        router.replace('/profissional');
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

  return (
    <div className="relative min-h-screen bg-background">
      <AuroraBackground variant="subtle" className="fixed" />

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-bela-plum/60 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-border/60 bg-card/90 backdrop-blur-xl transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between px-6">
            <Logo />
            <button onClick={() => setSidebarOpen(false)} className="text-muted-foreground lg:hidden">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="border-b border-border/60 px-6 py-4">
            <p className="truncate font-medium">{user.name}</p>
            <p className="truncate text-sm text-muted-foreground">{user.business.name} · Profissional</p>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto p-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-gradient-brand text-white shadow-glow'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4.5 w-4.5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-border/60 p-4">
            <button
              onClick={() => logout()}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-4.5 w-4.5" />
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="relative lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/60 bg-card/70 px-4 backdrop-blur-xl lg:px-8">
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-muted-foreground lg:hidden">
            <Menu className="h-6 w-6" />
          </button>
          <span className="text-sm capitalize text-muted-foreground">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </header>
        <main className="relative p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
