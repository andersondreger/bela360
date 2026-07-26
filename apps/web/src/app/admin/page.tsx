'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ticket, Building2, LogOut } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge } from '@/components/ui';
import { fetchCurrentUser, logout, type CurrentUser } from '@/lib/auth';
import {
  platformApi,
  PREMIUM_MODULE_LABELS,
  type PlatformBusiness,
  type PlatformCoupon,
  type PremiumModule,
} from '@/lib/api';

const ALL_MODULES = Object.keys(PREMIUM_MODULE_LABELS) as PremiumModule[];

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [businesses, setBusinesses] = useState<PlatformBusiness[]>([]);
  const [coupons, setCoupons] = useState<PlatformCoupon[]>([]);
  const [selectedModules, setSelectedModules] = useState<PremiumModule[]>([]);
  const [durationDays, setDurationDays] = useState('30');
  const [targetBusinessId, setTargetBusinessId] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetchCurrentUser().then((current) => {
      if (!active) return;
      if (!current) {
        router.replace('/login');
        return;
      }
      if (!current.isSuperAdmin) {
        router.replace('/dashboard');
        return;
      }
      setUser(current);
      setChecking(false);
      Promise.all([platformApi.listBusinesses(), platformApi.listCoupons()]).then(([b, c]) => {
        setBusinesses(b);
        setCoupons(c);
      });
    });
    return () => {
      active = false;
    };
  }, [router]);

  const toggleModule = (module: PremiumModule) => {
    setSelectedModules((prev) =>
      prev.includes(module) ? prev.filter((m) => m !== module) : [...prev, module]
    );
  };

  const handleCreateCoupon = async () => {
    if (selectedModules.length === 0) {
      setError('Selecione ao menos um módulo.');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const coupon = await platformApi.createCoupon({
        modules: selectedModules,
        durationDays: parseInt(durationDays, 10) || 30,
        targetBusinessId: targetBusinessId || undefined,
      });
      setCoupons((prev) => [coupon, ...prev]);
      setSelectedModules([]);
      setTargetBusinessId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar cupom.');
    } finally {
      setCreating(false);
    }
  };

  if (checking || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h1 className="text-lg font-bold text-foreground">bela360 · Admin da Plataforma</h1>
          <p className="text-sm text-muted-foreground">Cupons de plano premium para os salões clientes</p>
        </div>
        <Button variant="ghost" size="sm" onClick={logout}>
          <LogOut className="h-4 w-4" /> Sair
        </Button>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-4 w-4" /> Criar cupom
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Módulos a desbloquear</label>
              <div className="flex flex-wrap gap-2">
                {ALL_MODULES.map((module) => (
                  <button
                    key={module}
                    type="button"
                    onClick={() => toggleModule(module)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      selectedModules.includes(module)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {PREMIUM_MODULE_LABELS[module]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Validade (dias após resgate)"
                type="number"
                min={1}
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
              />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Restringir a um salão (opcional)
                </label>
                <select
                  value={targetBusinessId}
                  onChange={(e) => setTargetBusinessId(e.target.value)}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="">Qualquer salão pode resgatar</option>
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.phone})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="button" variant="primary" onClick={handleCreateCoupon} loading={creating}>
              Gerar cupom
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cupons gerados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {coupons.length === 0 && <p className="text-sm text-muted-foreground">Nenhum cupom criado ainda.</p>}
            {coupons.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3"
              >
                <div>
                  <p className="font-mono text-sm font-semibold text-foreground">{c.code}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.modules.map((m) => PREMIUM_MODULE_LABELS[m]).join(', ')} · {c.durationDays} dias
                  </p>
                </div>
                <Badge variant={c.redeemedAt ? 'success' : 'default'}>
                  {c.redeemedAt ? `Resgatado por ${c.business?.name ?? '—'}` : 'Aguardando resgate'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Salões cadastrados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {businesses.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{b.name}</p>
                  <p className="text-xs text-muted-foreground">{b.phone}</p>
                </div>
                <Badge>{b.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
