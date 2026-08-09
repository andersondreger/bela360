import { SubscriptionStatus } from '@prisma/client';
import { prisma, env, logger } from '../../config';
import { AppError, ValidationError, NotFoundError } from '../../common/errors';
import { PREMIUM_MODULES } from '../platform/plan';
import { asaasClient } from './asaas.client';

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function isValidDocument(document: string): boolean {
  const digits = onlyDigits(document);
  return digits.length === 11 || digits.length === 14; // CPF ou CNPJ (sem validar digito verificador)
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function unlockPremiumModules(settings: unknown, expiresAt: Date): Record<string, any> {
  const current = (settings as Record<string, any>) || {};
  const premiumModules = { ...(current.premiumModules || {}) };
  for (const module of PREMIUM_MODULES) {
    premiumModules[module] = expiresAt.toISOString();
  }
  return { ...current, premiumModules };
}

export class BillingService {
  async getSubscription(businessId: string) {
    return prisma.subscription.findUnique({ where: { businessId } });
  }

  /**
   * Cria (ou retoma) a assinatura recorrente do negocio no Asaas e devolve
   * o link de pagamento da primeira fatura. Idempotente: se ja existe uma
   * assinatura nao cancelada, so devolve a fatura mais recente em vez de
   * criar uma nova no Asaas.
   */
  async createCheckout(businessId: string, input: { document?: string }) {
    const business = await prisma.business.findUniqueOrThrow({ where: { id: businessId } });

    const existing = await prisma.subscription.findUnique({ where: { businessId } });
    if (existing && existing.status !== SubscriptionStatus.CANCELLED) {
      const payment = await asaasClient.getLatestPayment(existing.asaasSubscriptionId);
      if (!payment) {
        throw new AppError('Assinatura já existe mas nenhuma fatura foi encontrada. Tente novamente em instantes.', 502);
      }
      return { checkoutUrl: payment.invoiceUrl, subscription: existing };
    }

    const document = input.document ? onlyDigits(input.document) : business.document;
    if (!document) {
      throw new ValidationError('Informe o CPF ou CNPJ do responsável pelo negócio para gerar a cobrança.');
    }
    if (!isValidDocument(document)) {
      throw new ValidationError('CPF/CNPJ inválido.');
    }
    if (document !== business.document) {
      await prisma.business.update({ where: { id: businessId }, data: { document } });
    }

    let customer = await asaasClient.findCustomerByDocument(document);
    if (!customer) {
      customer = await asaasClient.createCustomer({
        name: business.name,
        cpfCnpj: document,
        email: business.email ?? undefined,
        mobilePhone: business.phone,
      });
    }

    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 1); // primeira cobranca amanha

    const asaasSubscription = await asaasClient.createSubscription({
      customer: customer.id,
      value: env.ASAAS_SUBSCRIPTION_VALUE,
      nextDueDate: toIsoDate(nextDueDate),
      description: 'Assinatura bela360 — Plano Premium',
    });

    const subscription = await prisma.subscription.upsert({
      where: { businessId },
      create: {
        businessId,
        asaasCustomerId: customer.id,
        asaasSubscriptionId: asaasSubscription.id,
        value: env.ASAAS_SUBSCRIPTION_VALUE,
        status: SubscriptionStatus.PENDING_PAYMENT,
        nextDueDate,
      },
      update: {
        asaasCustomerId: customer.id,
        asaasSubscriptionId: asaasSubscription.id,
        value: env.ASAAS_SUBSCRIPTION_VALUE,
        status: SubscriptionStatus.PENDING_PAYMENT,
        nextDueDate,
        cancelledAt: null,
      },
    });

    const payment = await asaasClient.getLatestPayment(asaasSubscription.id);
    logger.info({ businessId, asaasSubscriptionId: asaasSubscription.id }, 'Subscription checkout created');

    return { checkoutUrl: payment?.invoiceUrl ?? null, subscription };
  }

  async cancel(businessId: string) {
    const subscription = await prisma.subscription.findUnique({ where: { businessId } });
    if (!subscription) {
      throw new NotFoundError('Assinatura');
    }
    if (subscription.status === SubscriptionStatus.CANCELLED) {
      return subscription;
    }

    await asaasClient.cancelSubscription(subscription.asaasSubscriptionId);

    return prisma.subscription.update({
      where: { businessId },
      data: { status: SubscriptionStatus.CANCELLED, cancelledAt: new Date() },
    });
  }

  /**
   * Trata os eventos de cobranca do Asaas. So processa eventos ligados a
   * uma assinatura conhecida — qualquer outra coisa (cobranca avulsa, evento
   * desconhecido) e ignorada silenciosamente.
   */
  async handleWebhookEvent(event: string, payment: { subscription?: string; dueDate?: string } | undefined) {
    if (!payment?.subscription) return;

    const subscription = await prisma.subscription.findUnique({
      where: { asaasSubscriptionId: payment.subscription },
    });
    if (!subscription) return;

    switch (event) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED': {
        const asaasSubscription = await asaasClient.getSubscription(subscription.asaasSubscriptionId);
        const nextDueDate = new Date(asaasSubscription.nextDueDate);

        const business = await prisma.business.findUniqueOrThrow({ where: { id: subscription.businessId } });

        await prisma.$transaction([
          prisma.subscription.update({
            where: { id: subscription.id },
            data: { status: SubscriptionStatus.ACTIVE, nextDueDate },
          }),
          prisma.business.update({
            where: { id: subscription.businessId },
            data: {
              settings: unlockPremiumModules(business.settings, nextDueDate),
              ...(business.status === 'PENDING' ? { status: 'ACTIVE' as const } : {}),
            },
          }),
        ]);

        logger.info({ businessId: subscription.businessId }, 'Subscription payment confirmed, premium modules unlocked');
        break;
      }

      case 'PAYMENT_OVERDUE':
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: SubscriptionStatus.OVERDUE },
        });
        logger.warn({ businessId: subscription.businessId }, 'Subscription payment overdue');
        break;

      case 'PAYMENT_DELETED':
      case 'PAYMENT_REFUNDED':
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: SubscriptionStatus.OVERDUE },
        });
        logger.warn({ businessId: subscription.businessId, event }, 'Subscription payment reversed');
        break;

      default:
        logger.debug({ event }, 'Unhandled Asaas webhook event');
    }
  }
}

export const billingService = new BillingService();
