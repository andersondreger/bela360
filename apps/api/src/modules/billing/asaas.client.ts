import axios, { AxiosInstance } from 'axios';
import { env, logger } from '../../config';
import { AppError } from '../../common/errors';

// Cliente fino pro Asaas (gateway de pagamento). So cobre o que a assinatura
// SaaS do bela360 precisa: achar/criar cliente e criar/cancelar assinatura
// recorrente. Docs: https://docs.asaas.com/reference

export interface AsaasCustomer {
  id: string;
  name: string;
  cpfCnpj: string;
}

export interface AsaasSubscription {
  id: string;
  customer: string;
  status: string;
  nextDueDate: string;
  value: number;
}

export interface AsaasPayment {
  id: string;
  subscription?: string;
  status: string;
  invoiceUrl: string;
  dueDate: string;
}

function baseUrl(): string {
  return env.ASAAS_ENVIRONMENT === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://sandbox.asaas.com/api/v3';
}

let client: AxiosInstance | null = null;

function http(): AxiosInstance {
  if (!env.ASAAS_API_KEY) {
    throw new AppError(
      'Cobrança ainda não configurada nesta instância (falta ASAAS_API_KEY). Fale com o administrador da plataforma.',
      503,
      'BILLING_NOT_CONFIGURED'
    );
  }

  if (!client) {
    client = axios.create({
      baseURL: baseUrl(),
      headers: {
        'Content-Type': 'application/json',
        access_token: env.ASAAS_API_KEY,
      },
      timeout: 15000,
    });
  }

  return client;
}

function unwrapError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const asaasMessage = error.response?.data?.errors?.[0]?.description;
    logger.error({ status: error.response?.status, data: error.response?.data }, 'Asaas API error');
    throw new AppError(asaasMessage || 'Falha ao comunicar com o gateway de pagamento', 502, 'ASAAS_ERROR');
  }
  throw error;
}

export const asaasClient = {
  async findCustomerByDocument(cpfCnpj: string): Promise<AsaasCustomer | null> {
    try {
      const { data } = await http().get('/customers', { params: { cpfCnpj } });
      return data.data?.[0] ?? null;
    } catch (error) {
      unwrapError(error);
    }
  },

  async createCustomer(input: { name: string; cpfCnpj: string; email?: string; mobilePhone?: string }): Promise<AsaasCustomer> {
    try {
      const { data } = await http().post('/customers', input);
      return data;
    } catch (error) {
      unwrapError(error);
    }
  },

  async createSubscription(input: {
    customer: string;
    value: number;
    nextDueDate: string; // YYYY-MM-DD
    description: string;
  }): Promise<AsaasSubscription> {
    try {
      const { data } = await http().post('/subscriptions', {
        customer: input.customer,
        billingType: 'UNDEFINED', // deixa o cliente escolher Pix/boleto/cartao na fatura
        cycle: 'MONTHLY',
        value: input.value,
        nextDueDate: input.nextDueDate,
        description: input.description,
      });
      return data;
    } catch (error) {
      unwrapError(error);
    }
  },

  async getSubscription(subscriptionId: string): Promise<AsaasSubscription> {
    try {
      const { data } = await http().get(`/subscriptions/${subscriptionId}`);
      return data;
    } catch (error) {
      unwrapError(error);
    }
  },

  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      await http().delete(`/subscriptions/${subscriptionId}`);
    } catch (error) {
      unwrapError(error);
    }
  },

  async getLatestPayment(subscriptionId: string): Promise<AsaasPayment | null> {
    try {
      const { data } = await http().get('/payments', {
        params: { subscription: subscriptionId, limit: 1, order: 'desc' },
      });
      return data.data?.[0] ?? null;
    } catch (error) {
      unwrapError(error);
    }
  },
};
