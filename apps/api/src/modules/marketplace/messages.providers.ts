import axios from 'axios';
import { env } from '../../config';

/** Canais reais do marketplace. Credenciais so no servidor (env); nada e logado alem de ids. */

export const waConfigured = () => !!(env.MARKETPLACE_WA_TOKEN && env.MARKETPLACE_WA_PHONE_ID);
export const emailConfigured = () => !!(env.MARKETPLACE_EMAIL_API_KEY && env.MARKETPLACE_EMAIL_FROM);

function errText(e: unknown): string {
  const ax = e as { response?: { status?: number; data?: any }; message?: string };
  const detail = ax.response?.data?.error?.message ?? ax.response?.data?.message ?? ax.message ?? 'erro';
  return `${ax.response?.status ?? 'net'}: ${String(detail).slice(0, 300)}`;
}

/** WhatsApp Cloud API oficial: mensagem iniciada pela empresa exige template aprovado. */
export async function sendWhatsAppTemplate(to: string, templateName: string, params: string[]): Promise<string> {
  const base = env.MARKETPLACE_WA_BASE_URL ?? 'https://graph.facebook.com';
  try {
    const r = await axios.post(
      `${base}/${env.MARKETPLACE_WA_API_VERSION}/${env.MARKETPLACE_WA_PHONE_ID}/messages`,
      {
        messaging_product: 'whatsapp', to, type: 'template',
        template: {
          name: templateName, language: { code: env.MARKETPLACE_WA_LANG },
          components: params.length ? [{ type: 'body', parameters: params.map(text => ({ type: 'text', text })) }] : [],
        },
      },
      { headers: { Authorization: `Bearer ${env.MARKETPLACE_WA_TOKEN}` }, timeout: 15000 },
    );
    return String(r.data?.messages?.[0]?.id ?? '');
  } catch (e) { throw new Error(errText(e)); }
}

/** E-mail transacional via Resend (HTTP, sem dependencia nova). */
export async function sendEmail(to: string, subject: string, text: string): Promise<string> {
  const base = env.MARKETPLACE_EMAIL_BASE_URL ?? 'https://api.resend.com';
  try {
    const r = await axios.post(`${base}/emails`, { from: env.MARKETPLACE_EMAIL_FROM, to: [to], subject, text },
      { headers: { Authorization: `Bearer ${env.MARKETPLACE_EMAIL_API_KEY}` }, timeout: 15000 });
    return String(r.data?.id ?? '');
  } catch (e) { throw new Error(errText(e)); }
}
