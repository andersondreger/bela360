import { randomBytes } from 'crypto';
import { PlatformModule } from '@prisma/client';
import { prisma } from '../../config';
import { AppError } from '../../common/errors';

interface CreateCouponInput {
  createdById: string;
  modules: PlatformModule[];
  durationDays: number;
  targetBusinessId?: string;
}

function generateCode(): string {
  return randomBytes(4).toString('hex').toUpperCase(); // e.g. "A3F9C1B2"
}

export class PlatformService {
  async listBusinesses() {
    return prisma.business.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        status: true,
        settings: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listCoupons() {
    return prisma.platformCoupon.findMany({
      include: { business: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCoupon(input: CreateCouponInput) {
    const coupon = await prisma.platformCoupon.create({
      data: {
        code: generateCode(),
        modules: input.modules,
        durationDays: input.durationDays,
        targetBusinessId: input.targetBusinessId,
        createdById: input.createdById,
      },
    });

    return coupon;
  }

  async redeemCoupon(businessId: string, code: string) {
    const coupon = await prisma.platformCoupon.findUnique({ where: { code: code.toUpperCase() } });

    if (!coupon) {
      throw new AppError('Cupom não encontrado', 404);
    }

    if (coupon.redeemedAt) {
      throw new AppError('Cupom já foi utilizado', 409);
    }

    if (coupon.targetBusinessId && coupon.targetBusinessId !== businessId) {
      throw new AppError('Este cupom não é válido para o seu negócio', 403);
    }

    const business = await prisma.business.findUniqueOrThrow({ where: { id: businessId } });
    const settings = (business.settings as Record<string, any>) || {};
    const premiumModules = { ...(settings.premiumModules || {}) };

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + coupon.durationDays);

    for (const module of coupon.modules) {
      premiumModules[module] = expiresAt.toISOString();
    }

    const [, updatedBusiness] = await prisma.$transaction([
      prisma.platformCoupon.update({
        where: { id: coupon.id },
        data: { businessId, redeemedAt: new Date(), expiresAt },
      }),
      prisma.business.update({
        where: { id: businessId },
        data: { settings: { ...settings, premiumModules } },
      }),
    ]);

    return updatedBusiness;
  }
}

export const platformService = new PlatformService();
