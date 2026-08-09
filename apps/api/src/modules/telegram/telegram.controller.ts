import { Request, Response } from 'express';
import { env, logger } from '../../config';
import { handleAttendantMessage } from '../attendant';

export class TelegramController {
  async handleWebhook(req: Request, res: Response) {
    try {
      if (env.TELEGRAM_WEBHOOK_SECRET) {
        const token = req.header('x-telegram-bot-api-secret-token');
        if (token !== env.TELEGRAM_WEBHOOK_SECRET) {
          return res.sendStatus(401);
        }
      }

      const message = req.body?.message;
      const chatId = message?.chat?.id;
      const text = message?.text;

      if (chatId !== undefined && typeof text === 'string' && text.length > 0) {
        await handleAttendantMessage('telegram', String(chatId), text);
      }

      res.sendStatus(200);
    } catch (error) {
      logger.error({ error }, 'Telegram webhook error');
      // Sempre 200 pro Telegram nao ficar reenviando o mesmo update.
      res.sendStatus(200);
    }
  }
}

export const telegramController = new TelegramController();
