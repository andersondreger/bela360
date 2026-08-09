import axios from 'axios';
import { env, logger } from '../../config';

// Cliente fino pra Telegram Bot API. Canal alternativo ao WhatsApp pro
// atendimento de sistema (Ana) enquanto o numero WhatsApp institucional
// nao estiver conectado. Docs: https://core.telegram.org/bots/api

function baseUrl(): string {
  return `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}`;
}

export const telegramClient = {
  async sendMessage(chatId: string | number, text: string): Promise<void> {
    if (!env.TELEGRAM_BOT_TOKEN) {
      logger.warn('Telegram: TELEGRAM_BOT_TOKEN não configurado, mensagem não enviada');
      return;
    }
    try {
      await axios.post(`${baseUrl()}/sendMessage`, { chat_id: chatId, text });
    } catch (error) {
      logger.error({ error, chatId }, 'Falha ao enviar mensagem no Telegram');
    }
  },

  /**
   * Registra a URL de webhook no Telegram. secretToken e reenviado pelo
   * Telegram no header X-Telegram-Bot-Api-Secret-Token em toda chamada,
   * pra autenticar que a requisicao veio deles mesmo.
   */
  async setWebhook(url: string, secretToken?: string): Promise<void> {
    await axios.post(`${baseUrl()}/setWebhook`, {
      url,
      ...(secretToken ? { secret_token: secretToken } : {}),
    });
  },
};
