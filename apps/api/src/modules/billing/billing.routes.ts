import { Router } from 'express';
import { billingController } from './billing.controller';
import { authMiddleware } from '../../common/middleware/auth.middleware';

const router: Router = Router();

// Webhook do Asaas (autenticado por token custom, nao por JWT — ver controller)
router.post('/webhook', (req, res) => billingController.handleWebhook(req, res));

// O painel do Asaas (e alguns validadores) fazem um GET/HEAD de verificacao
// na URL antes de ativar o webhook. Sem isso a rota cai no authMiddleware
// abaixo e responde 401, e o Asaas marca a URL como invalida.
router.get('/webhook', (_req, res) => res.status(200).send('OK'));
router.head('/webhook', (_req, res) => res.sendStatus(200));

// Protegido: dono/negocio autenticado
router.use(authMiddleware);
router.get('/subscription', (req, res, next) => billingController.getSubscription(req, res, next));
router.post('/subscription/checkout', (req, res, next) => billingController.createCheckout(req, res, next));
router.post('/subscription/cancel', (req, res, next) => billingController.cancel(req, res, next));

export { router as billingRoutes };
