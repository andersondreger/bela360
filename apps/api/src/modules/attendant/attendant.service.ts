import Anthropic from '@anthropic-ai/sdk';
import { Redis } from 'ioredis';
import { env, logger } from '../../config';
import { getSupportWhatsAppService } from '../whatsapp/whatsapp.service';
import { telegramClient } from '../telegram/telegram.client';

const redis = new Redis(env.REDIS_URL || 'redis://localhost:6379');
const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const HISTORY_TTL_SECONDS = 24 * 60 * 60;
const HISTORY_MAX_MESSAGES = 20;

type ChatMessage = { role: 'user' | 'assistant'; content: string };
export type AttendantChannel = 'whatsapp' | 'telegram';

const SYSTEM_PROMPT = `Você é a Ana, atendente comercial do bela360 pelo WhatsApp.

O bela360 é um sistema de automação para salões, barbearias, clínicas de estética e spas. Recursos reais do produto, não invente nada além disso:
- Agendamento pelo WhatsApp: o cliente final marca horário direto conversando com o número do salão.
- Agenda inteligente com organização automática dos horários.
- Cadastro de clientes com histórico de atendimentos.
- Financeiro: controle de caixa, pagamentos e comissão por profissional.
- Relatórios em tempo real: receita, serviços mais vendidos, desempenho da equipe.
- Lembretes automáticos antes do horário marcado, pra reduzir falta.
- Cada negócio fica isolado no sistema — dado de um salão não aparece pra outro.
- Onboarding: cadastro leva menos de 2 minutos (nome do negócio + telefone), depois é só escanear um QR Code do WhatsApp e o bela360 já começa a atender.

Sobre preço e teste: o cadastro é gratuito e todo salão novo começa com 7 dias com TODOS os recursos liberados, sem cartão de crédito. Depois dos 7 dias, agenda, clientes e financeiro continuam liberados de graça; os recursos premium (marketing, automação, campanhas de fidelidade e controle de estoque) passam a exigir o plano de R$ 97/mês. Pode citar esse valor à vontade. Se pedirem desconto, condição especial ou negociação, diga que vai chamar alguém do time.

Seu objetivo: tirar dúvida de dono de salão/barbearia/clínica que chegou pelo site, explicar como o bela360 funciona, e incentivar o cadastro gratuito quando fizer sentido. Seja direta, calorosa, em português do Brasil, sem emoji em excesso. Respostas curtas — isso é WhatsApp, não e-mail. Se a pergunta fugir do que você sabe sobre o bela360, ou pedirem preço fechado/negociação, diga que vai chamar alguém do time pra continuar.`;

function historyKey(channel: AttendantChannel, externalId: string): string {
  return `attendant:history:${channel}:${externalId}`;
}

async function getHistory(channel: AttendantChannel, externalId: string): Promise<ChatMessage[]> {
  const raw = await redis.get(historyKey(channel, externalId));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ChatMessage[];
  } catch {
    return [];
  }
}

async function appendHistory(channel: AttendantChannel, externalId: string, messages: ChatMessage[]): Promise<void> {
  const existing = await getHistory(channel, externalId);
  const updated = [...existing, ...messages].slice(-HISTORY_MAX_MESSAGES);
  await redis.setex(historyKey(channel, externalId), HISTORY_TTL_SECONDS, JSON.stringify(updated));
}

async function sendReply(channel: AttendantChannel, externalId: string, text: string): Promise<void> {
  if (channel === 'whatsapp') {
    await getSupportWhatsAppService().sendText({ number: externalId, text });
  } else {
    await telegramClient.sendMessage(externalId, text);
  }
}

/**
 * Ana responde uma mensagem recebida pelo canal de sistema do bela360
 * (WhatsApp da instância bela360_system ou o bot do Telegram), não vinculada
 * a nenhum negócio específico.
 */
export async function handleAttendantMessage(channel: AttendantChannel, externalId: string, text: string): Promise<void> {
  const history = await getHistory(channel, externalId);

  // O canal de cliente é só o WhatsApp. O Telegram continua existindo apenas
  // como canal de alerta interno pro admin, mas se cair uma mensagem avulsa
  // no bot a Ana responde com o mesmo prompt, sem instruções específicas.
  const system = SYSTEM_PROMPT;

  try {
    const response = await anthropic.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 1024,
      system,
      output_config: { effort: 'medium' },
      messages: [...history, { role: 'user', content: text }],
    });

    if (response.stop_reason === 'refusal') {
      logger.warn({ channel, externalId }, 'Ana: resposta recusada pelo classificador de segurança');
      await sendReply(channel, externalId, 'Peraí, deixa eu chamar alguém do time pra te ajudar com isso.');
      return;
    }

    const textBlock = response.content.find((b) => b.type === 'text');
    const reply = textBlock && textBlock.type === 'text' ? textBlock.text : '';

    if (!reply) {
      logger.warn({ channel, externalId }, 'Ana: resposta vazia do modelo');
      return;
    }

    await sendReply(channel, externalId, reply);
    await appendHistory(channel, externalId, [
      { role: 'user', content: text },
      { role: 'assistant', content: reply },
    ]);

    logger.info({ channel, externalId }, 'Ana respondeu');
  } catch (error) {
    logger.error({ error, channel, externalId }, 'Falha ao gerar resposta da Ana');
  }
}
