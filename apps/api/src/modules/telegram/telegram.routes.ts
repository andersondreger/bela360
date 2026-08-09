import { Router } from 'express';
import { telegramController } from './telegram.controller';

const router: Router = Router();

// Webhook do Telegram (autenticado por secret token, ver controller)
router.post('/webhook', (req, res) => telegramController.handleWebhook(req, res));

export { router as telegramRoutes };
