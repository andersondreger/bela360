import { Request, Response, NextFunction } from 'express';
import { PlatformModule } from '@prisma/client';
import { prisma, env } from '../../config';
import { AppError, AuthenticationError } from '../../common/errors';

// Single source of truth for which modules require a redeemed PlatformCoupon.
// Every business starts on the básico plan (everything not listed here).
export const PREMIUM_MODULES: PlatformModule[] = [
  PlatformModule.MARKETING,
  PlatformModule.AUTOMATION,
  PlatformModule.LOYALTY,
  PlatformModule.INVENTORY,
];

/** Dias de teste completo (todos os módulos premium) a partir do cadastro. */
export const TRIAL_DAYS = env.TRIAL_DAYS;

interface TrialInfo {
  startedAt?: string;
  endsAt: string; // ISO
  plan?: string;
}

interface BusinessSettings {
  premiumModules?: Partial<Record<PlatformModule, string>>; // module -> ISO expiry
  trial?: TrialInfo;
  [key: string]: unknown;
}

export function isModuleUnlocked(settings: unknown, module: PlatformModule): boolean {
  const unlockedUntil = (settings as BusinessSettings | null)?.premiumModules?.[module];
  if (!unlockedUntil) return false;
  return new Date(unlockedUntil).getTime() > Date.now();
}

/**
 * Devolve um novo objeto de settings com TODOS os módulos premium liberados
 * até `endsAt` (agora + TRIAL_DAYS) e o carimbo do teste em `settings.trial`.
 * O bloqueio depois disso é automático: `isModuleUnlocked` só olha a data.
 * Usado no cadastro (business.service.create).
 */
export function withTrialUnlock(currentSettings: unknown, days = TRIAL_DAYS): Record<string, unknown> {
  const current = ((currentSettings as Record<string, unknown>) || {});
  const startedAt = new Date();
  const endsAt = new Date(startedAt.getTime() + days * 24 * 60 * 60 * 1000);

  const premiumModules: Record<string, string> = {
    ...((current.premiumModules as Record<string, string>) || {}),
  };
  for (const module of PREMIUM_MODULES) {
    premiumModules[module] = endsAt.toISOString();
  }

  return {
    ...current,
    premiumModules,
    trial: {
      startedAt: startedAt.toISOString(),
      endsAt: endsAt.toISOString(),
      plan: 'PREMIUM',
    } satisfies TrialInfo,
  };
}

/**
 * Estado do teste gratuito a partir de `settings.trial`. `null` se o negócio
 * nunca teve teste carimbado (contas antigas ao modelo de trial).
 */
export function getTrialStatus(settings: unknown): {
  startedAt: string | null;
  endsAt: string;
  active: boolean;
  daysLeft: number;
} | null {
  const trial = (settings as BusinessSettings | null)?.trial;
  if (!trial?.endsAt) return null;

  const msLeft = new Date(trial.endsAt).getTime() - Date.now();
  return {
    startedAt: trial.startedAt ?? null,
    endsAt: trial.endsAt,
    active: msLeft > 0,
    daysLeft: Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000))),
  };
}

/**
 * Populates req.superAdmin from the DB (not the JWT, so revoking access
 * doesn't require waiting out an old token's expiry). Cheap, low-traffic route group.
 */
export async function attachSuperAdminFlag(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AuthenticationError('Token não fornecido');
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { isSuperAdmin: true },
    });

    req.superAdmin = user?.isSuperAdmin ?? false;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Gates a route group behind an active coupon unlock for `module`.
 * Assumes authMiddleware already ran (req.user populated).
 */
export function requirePremiumModule(module: PlatformModule) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AuthenticationError('Token não fornecido');
      }

      const business = await prisma.business.findUnique({
        where: { id: req.user.businessId },
        select: { settings: true },
      });

      if (!business || !isModuleUnlocked(business.settings, module)) {
        const trial = getTrialStatus(business?.settings);
        const message = trial
          ? 'Seu teste gratuito de 7 dias terminou. Assine o plano Premium (R$ 97/mês) para voltar a usar marketing, automação, fidelidade e estoque.'
          : 'Este recurso faz parte do plano Premium do bela360 (R$ 97/mês). Assine em Configurações → Assinatura para liberar.';
        throw new AppError(message, 402);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
