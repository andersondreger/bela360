import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { env, logger } from '../../config';
import { AuthenticationError } from '../../common/errors';
import { billingService } from './billing.service';

const checkoutSchema = z.object({
  document: z.string().min(11).max(18).optional(),
});

export class BillingController {
  async getSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const subscription = await billingService.getSubscription(req.user!.businessId);
      res.json({ success: true, data: subscription });
    } catch (error) {
      next(error);
    }
  }

  async createCheckout(req: Request, res: Response, next: NextFunction) {
    try {
      const data = checkoutSchema.parse(req.body);
      const result = await billingService.createCheckout(req.user!.businessId, data);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const subscription = await billingService.cancel(req.user!.businessId);
      res.json({ success: true, data: subscription });
    } catch (error) {
      next(error);
    }
  }

  async handleWebhook(req: Request, res: Response) {
    try {
      // Token custom configurado no dashboard do Asaas ao cadastrar o webhook,
      // reenviado por eles nesse header em toda chamada — evita que qualquer
      // um forje um "pagamento confirmado" batendo direto nesse endpoint.
      if (env.ASAAS_WEBHOOK_TOKEN) {
        const token = req.header('asaas-access-token');
        if (token !== env.ASAAS_WEBHOOK_TOKEN) {
          throw new AuthenticationError('Webhook token inválido');
        }
      }

      const { event, payment } = req.body ?? {};
      await billingService.handleWebhookEvent(event, payment);

      res.sendStatus(200);
    } catch (error) {
      logger.error({ error }, 'Asaas webhook error');
      // Sempre 200 pro Asaas nao ficar reenviando um evento que ja falhou
      // por um motivo que reenviar nao resolve (ex: assinatura desconhecida).
      res.sendStatus(200);
    }
  }
}

export const billingController = new BillingController();
