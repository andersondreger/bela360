import { BusinessType } from '@prisma/client';
import { redis, logger } from '../../config';
import { businessService } from '../business';
import { authService } from '../auth/auth.service';

// Cadastro de negocio novo direto pelo chat do Telegram, sem passar pelo
// site nem depender do WhatsApp de sistema (que hoje nao conecta). Estado
// da conversa fica no Redis por chatId, TTL curto - se o dono sumir no meio,
// e so mandar /cadastrar de novo.

type Step = 'nome_salao' | 'tipo' | 'nome_dono' | 'telefone';

interface SignupState {
  step: Step;
  nome?: string;
  tipo?: BusinessType;
  ownerName?: string;
}

const STATE_TTL_SECONDS = 30 * 60;

const TIPO_OPCOES: Record<string, BusinessType> = {
  '1': 'SALON',
  '2': 'BARBERSHOP',
  '3': 'AESTHETICS',
  '4': 'SPA',
  '5': 'OTHER',
};

const TIPO_PROMPT =
  'Qual o tipo do seu negócio?\n\n1 - Salão de beleza\n2 - Barbearia\n3 - Clínica de estética\n4 - Spa\n5 - Outro\n\nResponda só o número.';

function stateKey(chatId: string): string {
  return `telegram:signup:${chatId}`;
}

async function getState(chatId: string): Promise<SignupState | null> {
  const raw = await redis.get(stateKey(chatId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SignupState;
  } catch {
    return null;
  }
}

async function setState(chatId: string, state: SignupState): Promise<void> {
  await redis.setex(stateKey(chatId), STATE_TTL_SECONDS, JSON.stringify(state));
}

async function clearState(chatId: string): Promise<void> {
  await redis.del(stateKey(chatId));
}

export async function startSignup(chatId: string): Promise<string> {
  await setState(chatId, { step: 'nome_salao' });
  return 'Vamos cadastrar seu salão, barbearia ou clínica no bela360! 💈\n\nPrimeiro: qual o nome do seu negócio?';
}

export async function handleSignupMessage(chatId: string, text: string): Promise<string | null> {
  const state = await getState(chatId);
  if (!state) return null;

  const trimmed = text.trim();

  switch (state.step) {
    case 'nome_salao': {
      if (trimmed.length < 2) return 'Nome muito curto. Qual o nome do seu negócio?';
      await setState(chatId, { ...state, nome: trimmed, step: 'tipo' });
      return TIPO_PROMPT;
    }

    case 'tipo': {
      const tipo = TIPO_OPCOES[trimmed];
      if (!tipo) return `Não entendi. ${TIPO_PROMPT}`;
      await setState(chatId, { ...state, tipo, step: 'nome_dono' });
      return 'Qual o seu nome (responsável pelo negócio)?';
    }

    case 'nome_dono': {
      if (trimmed.length < 2) return 'Nome muito curto. Qual o seu nome?';
      await setState(chatId, { ...state, ownerName: trimmed, step: 'telefone' });
      return 'Por último: qual o telefone/WhatsApp do negócio? Esse número vira seu login no bela360.\n\nEx: 45999998888';
    }

    case 'telefone': {
      const phone = trimmed.replace(/\D/g, '');
      if (phone.length < 10) return 'Telefone inválido. Manda com DDD, só números (ex: 45999998888).';

      try {
        const business = await businessService.create({
          name: state.nome!,
          phone,
          type: state.tipo!,
          ownerName: state.ownerName!,
          ownerPhone: phone,
        });

        const owner = business.users[0];
        await authService.relayCurrentOtpToTelegram(owner.id, chatId);
        await clearState(chatId);

        logger.info({ businessId: business.id, chatId }, 'Cadastro criado via Telegram');

        return `Prontinho, ${state.ownerName}! ${state.nome} já está cadastrado no bela360. 🎉\n\nSeu código de acesso acabou de chegar aqui mesmo. Entra em bela360.wayia.com.br/login com o telefone ${phone} e o código.`;
      } catch (error) {
        await clearState(chatId);
        logger.error({ error, chatId }, 'Falha ao criar cadastro via Telegram');
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        return `Não consegui concluir o cadastro (${message}). Manda /cadastrar pra tentar de novo.`;
      }
    }

    default:
      await clearState(chatId);
      return null;
  }
}
