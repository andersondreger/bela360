import { Router } from 'express';
import { billingController } from './billing.controller';
import { authMiddleware } from '../../common/middleware/auth.middleware';

const router: Router = Router();

// Webhook do Asaas (autenticado por token custom, nao por JWT — ver controller)
router.post('/webhook', (req, res) => billingController.handleWebhook(req, res));

// Protegido: dono/negocio autenticado
router.use(authMiddleware);
router.get('/subscription', (req, res, next) => billingController.getSubscription(req, res, next));
router.post('/subscription/checkout', (req, res, next) => billingController.createCheckout(req, res, next));
router.post('/subscription/cancel', (req, res, next) => billingController.cancel(req, res, next));

export { router as billingRoutes };
