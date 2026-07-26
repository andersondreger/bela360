import { Request, Response, NextFunction } from 'express';
import { PlatformModule } from '@prisma/client';
import { prisma } from '../../config';
import { AppError, AuthenticationError } from '../../common/errors';

// Single source of truth for which modules require a redeemed PlatformCoupon.
// Every business starts on the básico plan (everything not listed here).
export const PREMIUM_MODULES: PlatformModule[] = [
  PlatformModule.MARKETING,
  PlatformModule.AUTOMATION,
  PlatformModule.LOYALTY,
  PlatformModule.INVENTORY,
];

interface BusinessSettings {
  premiumModules?: Partial<Record<PlatformModule, string>>; // module -> ISO expiry
  [key: string]: unknown;
}

export function isModuleUnlocked(settings: unknown, module: PlatformModule): boolean {
  const unlockedUntil = (settings as BusinessSettings | null)?.premiumModules?.[module];
  if (!unlockedUntil) return false;
  return new Date(unlockedUntil).getTime() > Date.now();
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
        throw new AppError(
          'Este recurso faz parte do plano premium do bela360. Fale com o suporte para desbloquear com um cupom.',
          402
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
