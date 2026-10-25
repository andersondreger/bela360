import axios, { AxiosInstance } from 'axios';
import { env, logger } from '../../config';
import { AppError } from '../../common/errors';
import { centsToReais } from './rules';

// Cliente Asaas DO MARKETPLACE. Credenciais proprias (MARKETPLACE_ASAAS_*), nunca a chave da
// assinatura SaaS do bela360. Sandbox por padrao. Chaves so no servidor.

export const asaasEnabled = () => env.MARKETPLACE_GATEWAY === 'asaas';

function baseUrl(): string {
  return env.MARKETPLACE_ASAAS_BASE_URL
    ?? (env.MARKETPLACE_ASAAS_ENV === 'production' ? 'https://api.asaas.com/v3' : 'https://sandbox.asaas.com/api/v3');
}

let client: AxiosInstance | null = null;
function http(): AxiosInstance {
  if (!env.MARKETPLACE_ASAAS_API_KEY) {
    throw new AppError('Pagamentos do marketplace nao configurados (falta MARKETPLACE_ASAAS_API_KEY)', 503, 'MARKETPLACE_GATEWAY_NOT_CONFIGURED');
  }
  client ??= axios.create({ baseURL: baseUrl(), timeout: 15000, headers: { 'Content-Type': 'application/json', access_token: env.MARKETPLACE_ASAAS_API_KEY } });
  return client;
}

function fail(error: unknown): never {
  if (axios.isAxiosError(error)) {
    logger.error({ status: error.response?.status, data: error.response?.data }, 'Asaas (marketplace) error');
    throw new AppError(error.response?.data?.errors?.[0]?.description || 'Falha ao comunicar com o gateway de pagamento', 502, 'ASAAS_ERROR');
  }
  throw error;
}

export interface AsaasSplitItem { walletId: string; fixedCents: number }
export interface CreatedPayment { id: string; invoiceUrl: string; netValueCents: number }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** O Asaas nao expoe consulta publica de carteira de terceiros: validamos o formato aqui e o Asaas recusa
 *  walletId inexistente na criacao da cobranca (nada e cobrado nesse caso). */
export const walletIdLooksValid = (id: string) => UUID.test(id.trim());

export const asaasGateway = {
  async findOrCreateCustomer(input: { name: string; cpfCnpj: string; email?: string | null; phone?: string | null }): Promise<string> {
    try {
      const found = await http().get('/customers', { params: { cpfCnpj: input.cpfCnpj } });
      if (found.data.data?.[0]?.id) return found.data.data[0].id;
      const { data } = await http().post('/customers', { name: input.name, cpfCnpj: input.cpfCnpj, email: input.email ?? undefined, mobilePhone: input.phone ?? undefined });
      return data.id;
    } catch (e) { return fail(e); }
  },

  /** Um unico pagamento na conta principal da Bela 360. Split so com walletId dos distribuidores (nunca o da Bela). */
  async createPayment(input: { customerId: string; totalCents: number; checkoutId: string; description: string; split: AsaasSplitItem[] }): Promise<CreatedPayment> {
    const due = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
    try {
      const { data } = await http().post('/payments', {
        customer: input.customerId,
        billingType: 'UNDEFINED', // cliente escolhe Pix, boleto ou cartao
        value: centsToReais(input.totalCents),
        dueDate: due,
        description: input.description,
        externalReference: input.checkoutId,
        split: input.split.map(s => ({ walletId: s.walletId, fixedValue: centsToReais(s.fixedCents) })),
      });
      return { id: data.id, invoiceUrl: data.invoiceUrl, netValueCents: Math.round(Number(data.netValue ?? 0) * 100) };
    } catch (e) { return fail(e); }
  },

  async refund(paymentId: string, cents: number | null): Promise<void> {
    try { await http().post(`/payments/${paymentId}/refund`, cents === null ? {} : { value: centsToReais(cents) }); }
    catch (e) { fail(e); }
  },

  async deletePayment(paymentId: string): Promise<void> {
    try { await http().delete(`/payments/${paymentId}`); } catch (e) { fail(e); }
  },
};
