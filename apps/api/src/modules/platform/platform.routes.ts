import { Router } from 'express';
import { platformController } from './platform.controller';
import { attachSuperAdminFlag } from './plan';

const router: Router = Router();

// Any authenticated OWNER/ADMIN can redeem a coupon for their own business
router.post('/coupons/redeem', (req, res, next) => platformController.redeemCoupon(req, res, next));

// Everything else is platform-super-admin only
router.use(attachSuperAdminFlag);
router.get('/businesses', (req, res, next) => platformController.listBusinesses(req, res, next));
router.get('/coupons', (req, res, next) => platformController.listCoupons(req, res, next));
router.post('/coupons', (req, res, next) => platformController.createCoupon(req, res, next));

export { router as platformRoutes };
