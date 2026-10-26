import { prisma, env, logger } from '../../config';
import {
  AUDIENCE_OF, Channel, DEFAULT_BODIES, MESSAGE_TYPES, MessageType, Var,
  brl, defaultWaTemplateName, looksLikeEmail, normalizePhoneBR, render, waParams,
} from './messages.templates';
import { emailConfigured, sendEmail, sendWhatsAppTemplate, waConfigured } from './messages.providers';

/**
 * Mensagens transacionais (so sobre o pedido do proprio cliente; nunca marketing em massa).
 * - Chave unica pedido+tipo+canal+destinatario: reprocessar/retry nunca duplica.
 * - WhatsApp so com opt-in registrado (MarketplaceNotifyPref) e telefone valido; e-mail respeita emailOptIn.
 * - Falha de mensagem NUNCA desfaz dinheiro: enfileirar e enviar ficam fora das transacoes financeiras.
 */

const MAX_ATTEMPTS = 3;
const BATCH = 30; // teto por rodada (limite de volume)

export async function getPref(businessId: string) {
  return prisma.marketplaceNotifyPref.findUnique({ where: { businessId } });
}

export async function setPref(businessId: string, userId: string, data: { whatsappOptIn?: boolean; emailOptIn?: boolean }) {
  const cur = await prisma.marketplaceNotifyPref.findUnique({ where: { businessId } });
  const wa = data.whatsappOptIn;
  return prisma.marketplaceNotifyPref.upsert({
    where: { businessId },
    create: { businessId, whatsappOptIn: !!wa, whatsappOptInAt: wa ? new Date() : null, whatsappOptInBy: wa ? userId : null, emailOptIn: data.emailOptIn ?? true },
    update: {
      ...(wa !== undefined && wa !== cur?.whatsappOptIn ? { whatsappOptIn: wa, whatsappOptInAt: wa ? new Date() : cur?.whatsappOptInAt, whatsappOptInBy: wa ? userId : cur?.whatsappOptInBy } : {}),
      ...(data.emailOptIn !== undefined ? { emailOptIn: data.emailOptIn } : {}),
    },
  });
}

async function templateFor(type: MessageType, channel: Channel) {
  const row = await prisma.marketplaceMessageTemplate.findUnique({ where: { type_channel: { type, channel } } });
  if (row && !row.active) return null;
  const def = DEFAULT_BODIES[type];
  return { subject: def.subject, body: row?.body ?? def.body, waTemplateName: row?.waTemplateName || defaultWaTemplateName(type) };
}

/** Enfileira as mensagens de um evento do pedido. Nunca lanca (best effort, fora da transacao financeira). */
export async function enqueueOrderMessages(orderId: string, type: MessageType): Promise<void> {
  if (env.MARKETPLACE_MESSAGES === 'off') return;
  try {
    const o = await prisma.marketplaceOrder.findUnique({
      where: { id: orderId },
      include: { distributor: { select: { name: true, contact: true } } },
    });
    if (!o) return;
    const biz = await prisma.business.findUnique({ where: { id: o.businessId }, select: { name: true, phone: true, email: true } });
    if (!biz) return;
    const pref = await getPref(o.businessId);
    const audience = AUDIENCE_OF[type];
    const vars: Partial<Record<Var, string>> = {
      nome: biz.name, pedido: String(o.number), valor: brl(audience === 'CLIENTE' ? o.paidCents : o.subtotalCents),
      cashback: brl(o.cashbackCents), distribuidor: o.distributor.name,
    };

    const rows: { channel: Channel; to: string | null; ignore?: string }[] = [];
    if (audience === 'CLIENTE') {
      const phone = normalizePhoneBR(biz.phone);
      rows.push({ channel: 'WHATSAPP', to: phone, ignore: !pref?.whatsappOptIn ? 'sem opt-in de WhatsApp' : !phone ? 'telefone invalido' : undefined });
      rows.push({ channel: 'EMAIL', to: biz.email ?? null, ignore: pref && !pref.emailOptIn ? 'cliente desativou e-mail' : !looksLikeEmail(biz.email) ? 'sem e-mail valido' : undefined });
    } else {
      // Distribuidor: so e-mail (parceiro B2B; sem opt-in de WhatsApp registrado).
      const c = o.distributor.contact?.trim() ?? '';
      rows.push({ channel: 'WHATSAPP', to: null, ignore: 'WhatsApp de distribuidor desativado (sem opt-in)' });
      rows.push({ channel: 'EMAIL', to: looksLikeEmail(c) ? c : null, ignore: looksLikeEmail(c) ? undefined : 'contato do distribuidor sem e-mail' });
    }

    for (const r of rows) {
      const tpl = await templateFor(type, r.channel);
      if (!tpl) continue; // template desativado pelo CEO
      await prisma.marketplaceMessage.createMany({
        skipDuplicates: true,
        data: [{
          businessId: o.businessId, orderId: o.id, type, channel: r.channel, audience, toAddress: r.to,
          subject: r.channel === 'EMAIL' ? render(tpl.subject, vars) : null,
          body: render(tpl.body, vars),
          params: r.channel === 'WHATSAPP' ? { template: tpl.waTemplateName, values: waParams(type, vars) } : undefined,
          status: r.ignore ? 'IGNORADO' : 'PENDENTE', error: r.ignore ?? null,
        }],
      });
    }
  } catch (e) {
    logger.error({ e, orderId, type }, 'marketplace: falha ao enfileirar mensagem');
  }
}

export async function enqueueMany(orderIds: string[], type: MessageType) {
  for (const id of orderIds) await enqueueOrderMessages(id, type);
}

/** Envia pendentes (ate BATCH por rodada). Idempotente: so pega PENDENTE e conta tentativas. */
export async function dispatchPending(): Promise<{ sent: number; failed: number }> {
  if (env.MARKETPLACE_MESSAGES === 'off') return { sent: 0, failed: 0 };
  const pending = await prisma.marketplaceMessage.findMany({ where: { status: 'PENDENTE' }, orderBy: { createdAt: 'asc' }, take: BATCH });
  let sent = 0, failed = 0;
  for (const m of pending) {
    // Reserva a linha: outra instancia/rodada nao pega a mesma mensagem.
    const claimed = await prisma.marketplaceMessage.updateMany({ where: { id: m.id, status: 'PENDENTE', attempts: m.attempts }, data: { attempts: { increment: 1 } } });
    if (claimed.count === 0) continue;
    try {
      if (env.MARKETPLACE_MESSAGES === 'simulado') {
        await prisma.marketplaceMessage.update({ where: { id: m.id }, data: { status: 'SIMULADO', sentAt: new Date() } });
        continue;
      }
      if (!m.toAddress) throw new Permanent('sem destinatario');
      let providerId = '';
      if (m.channel === 'WHATSAPP') {
        if (!waConfigured()) throw new Permanent('WhatsApp Cloud API nao configurada');
        const p = m.params as { template: string; values: string[] };
        providerId = await sendWhatsAppTemplate(m.toAddress, p.template, p.values);
      } else {
        if (!emailConfigured()) throw new Permanent('e-mail nao configurado');
        providerId = await sendEmail(m.toAddress, m.subject ?? 'Marketplace Bela 360', m.body);
      }
      await prisma.marketplaceMessage.update({ where: { id: m.id }, data: { status: 'ENVIADO', providerId, sentAt: new Date(), error: null } });
      sent++;
    } catch (e) {
      failed++;
      const permanent = e instanceof Permanent;
      const msg = (e as Error).message.slice(0, 300);
      const giveUp = permanent || m.attempts + 1 >= MAX_ATTEMPTS;
      await prisma.marketplaceMessage.update({ where: { id: m.id }, data: { status: giveUp ? (permanent ? 'IGNORADO' : 'FALHOU') : 'PENDENTE', error: msg } });
      logger.warn({ id: m.id, channel: m.channel, msg }, 'marketplace: mensagem nao enviada');
    }
  }
  return { sent, failed };
}

class Permanent extends Error {}

// ---------- leitura ----------

export async function listMessages(businessId: string, take = 100) {
  return prisma.marketplaceMessage.findMany({
    where: { businessId, audience: 'CLIENTE' },
    select: { id: true, orderId: true, type: true, channel: true, status: true, subject: true, body: true, error: true, createdAt: true, sentAt: true },
    orderBy: { createdAt: 'desc' }, take,
  });
}

export async function clientMessagesView(businessId: string) {
  const [pref, messages] = await Promise.all([getPref(businessId), listMessages(businessId)]);
  return {
    mode: env.MARKETPLACE_MESSAGES,
    pref: { whatsappOptIn: pref?.whatsappOptIn ?? false, whatsappOptInAt: pref?.whatsappOptInAt ?? null, emailOptIn: pref?.emailOptIn ?? true },
    messages,
  };
}

// ---------- CEO ----------

export async function ceoMessagesView() {
  const [templates, byStatus, recent] = await Promise.all([
    prisma.marketplaceMessageTemplate.findMany(),
    prisma.marketplaceMessage.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.marketplaceMessage.findMany({ orderBy: { createdAt: 'desc' }, take: 100, select: { id: true, businessId: true, orderId: true, type: true, channel: true, audience: true, status: true, error: true, createdAt: true, sentAt: true } }),
  ]);
  const have = new Map(templates.map(t => [`${t.type}:${t.channel}`, t]));
  const catalog = MESSAGE_TYPES.flatMap(type => (['WHATSAPP', 'EMAIL'] as Channel[]).map(channel => {
    const t = have.get(`${type}:${channel}`);
    return { type, channel, audience: AUDIENCE_OF[type], body: t?.body ?? DEFAULT_BODIES[type].body, waTemplateName: t?.waTemplateName ?? defaultWaTemplateName(type), active: t?.active ?? true, customized: !!t };
  }));
  return {
    mode: env.MARKETPLACE_MESSAGES, whatsappConfigured: waConfigured(), emailConfigured: emailConfigured(),
    counts: Object.fromEntries(byStatus.map(s => [s.status, s._count._all])), templates: catalog, recent,
  };
}

export async function upsertTemplate(type: MessageType, channel: Channel, data: { body?: string; waTemplateName?: string | null; active?: boolean }) {
  return prisma.marketplaceMessageTemplate.upsert({
    where: { type_channel: { type, channel } },
    create: { type, channel, body: data.body ?? DEFAULT_BODIES[type].body, waTemplateName: data.waTemplateName ?? null, active: data.active ?? true },
    update: { ...(data.body !== undefined ? { body: data.body } : {}), ...(data.waTemplateName !== undefined ? { waTemplateName: data.waTemplateName } : {}), ...(data.active !== undefined ? { active: data.active } : {}) },
  });
}
