import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PlatformModule } from '@prisma/client';
import { platformService } from './platform.service';
import { AuthorizationError } from '../../common/errors';

const createCouponSchema = z.object({
  modules: z.array(z.nativeEnum(PlatformModule)).min(1),
  durationDays: z.number().int().positive().max(3650),
  targetBusinessId: z.string().cuid().optional(),
});

const redeemCouponSchema = z.object({
  code: z.string().min(4).max(32),
});

function assertSuperAdmin(req: Request) {
  if (!req.superAdmin) {
    throw new AuthorizationError('Acesso restrito ao administrador da plataforma');
  }
}

export class PlatformController {
  async listBusinesses(req: Request, res: Response, next: NextFunction) {
    try {
      assertSuperAdmin(req);
      const businesses = await platformService.listBusinesses();
      res.json({ success: true, data: businesses });
    } catch (error) {
      next(error);
    }
  }

  async listCoupons(req: Request, res: Response, next: NextFunction) {
    try {
      assertSuperAdmin(req);
      const coupons = await platformService.listCoupons();
      res.json({ success: true, data: coupons });
    } catch (error) {
      next(error);
    }
  }

  async createCoupon(req: Request, res: Response, next: NextFunction) {
    try {
      assertSuperAdmin(req);
      const data = createCouponSchema.parse(req.body);
      const coupon = await platformService.createCoupon({
        createdById: req.user!.userId,
        ...data,
      });
      res.status(201).json({ success: true, data: coupon });
    } catch (error) {
      next(error);
    }
  }

  async redeemCoupon(req: Request, res: Response, next: NextFunction) {
    try {
      const { code } = redeemCouponSchema.parse(req.body);
      const business = await platformService.redeemCoupon(req.user!.businessId, code);
      res.json({ success: true, data: business });
    } catch (error) {
      next(error);
    }
  }
}

export const platformController = new PlatformController();
