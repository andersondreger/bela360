import { Request, Response } from 'express';
import { env, logger } from '../../config';
import { handleAttendantMessage } from '../attendant';
import { authService } from '../auth/auth.service';
import { telegramClient } from './telegram.client';
import { startSignup, handleSignupMessage } from './telegram-signup.service';

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
        const id = String(chatId);
        const startMatch = text.match(/^\/start\s+(\S+)/);

        if (startMatch) {
          await this.handleStart(id, startMatch[1]);
        } else if (/^\/cadastrar\b/i.test(text.trim())) {
          await telegramClient.sendMessage(id, await startSignup(id));
        } else {
          const signupReply = await handleSignupMessage(id, text);
          if (signupReply !== null) {
            await telegramClient.sendMessage(id, signupReply);
          } else {
            await handleAttendantMessage('telegram', id, text);
          }
        }
      }

      res.sendStatus(200);
    } catch (error) {
      logger.error({ error }, 'Telegram webhook error');
      // Sempre 200 pro Telegram nao ficar reenviando o mesmo update.
      res.sendStatus(200);
    }
  }

  /**
   * "/start <token>" vincula esse chat a uma conta bela360 ja existente
   * (token gerado por POST /auth/telegram/link). Fora isso, mensagens vao
   * pra Ana normalmente.
   */
  private async handleStart(chatId: string, token: string): Promise<void> {
    const result = await authService.linkTelegram(token, chatId);

    const text = result.linked
      ? `Conta vinculada, ${result.userName}! A partir de agora seu código de acesso do bela360 também chega por aqui.`
      : 'Esse link já expirou ou não é válido. Gere um novo na tela de login do bela360 e tenta de novo.';

    await telegramClient.sendMessage(chatId, text);
  }
}

export const telegramController = new TelegramController();
