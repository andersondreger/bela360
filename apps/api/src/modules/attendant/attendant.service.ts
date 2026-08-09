import Anthropic from '@anthropic-ai/sdk';
import { Redis } from 'ioredis';
import { env, logger } from '../../config';
import { getSystemWhatsAppService } from '../whatsapp/whatsapp.service';
import { telegramClient } from '../telegram/telegram.client';

const redis = new Redis(env.REDIS_URL || 'redis://localhost:6379');
const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const HISTORY_TTL_SECONDS = 24 * 60 * 60;
const HISTORY_MAX_MESSAGES = 20;

type ChatMessage = { role: 'user' | 'assistant'; content: string };
export type AttendantChannel = 'whatsapp' | 'telegram';

const SYSTEM_PROMPT = `Você é a Ana, atendente comercial do bela360 pelo WhatsApp e Telegram.

O bela360 é um sistema de automação para salões, barbearias, clínicas de estética e spas. Recursos reais do produto, não invente nada além disso:
- Agendamento pelo WhatsApp: o cliente final marca horário direto conversando com o número do salão.
- Agenda inteligente com organização automática dos horários.
- Cadastro de clientes com histórico de atendimentos.
- Financeiro: controle de caixa, pagamentos e comissão por profissional.
- Relatórios em tempo real: receita, serviços mais vendidos, desempenho da equipe.
- Lembretes automáticos antes do horário marcado, pra reduzir falta.
- Cada negócio fica isolado no sistema — dado de um salão não aparece pra outro.
- Onboarding: cadastro leva menos de 2 minutos (nome do negócio + telefone), depois é só escanear um QR Code do WhatsApp e o bela360 já começa a atender.

Sobre preço: você não tem uma tabela de planos pra citar. Se perguntarem, diga que o cadastro inicial é gratuito (é a chamada "Cadastre seu salão grátis" do site) e que pra falar de plano pago o ideal é continuar com um humano — nunca invente valor.

Seu objetivo: tirar dúvida de dono de salão/barbearia/clínica que chegou pelo site ou pelo Telegram, explicar como o bela360 funciona, e incentivar o cadastro gratuito quando fizer sentido. Seja direta, calorosa, em português do Brasil, sem emoji em excesso. Respostas curtas — isso é WhatsApp/Telegram, não e-mail. Se a pergunta fugir do que você sabe sobre o bela360, ou pedirem preço fechado/negociação, diga que vai chamar alguém do time pra continuar.`;

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
    await getSystemWhatsAppService().sendText({ number: externalId, text });
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

  const system =
    channel === 'telegram'
      ? `${SYSTEM_PROMPT}\n\nEssa conversa é pelo Telegram. Se a pessoa quiser se cadastrar, diga pra mandar o comando /cadastrar que o próprio bot já faz o cadastro completo ali na hora, sem precisar abrir o site.`
      : SYSTEM_PROMPT;

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
