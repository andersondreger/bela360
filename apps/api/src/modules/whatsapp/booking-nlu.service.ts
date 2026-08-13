import Anthropic from '@anthropic-ai/sdk';
import { env, logger } from '../../config';

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

interface Option {
  id: string;
  label: string;
}

const NONE = 'NENHUMA';

/**
 * O fluxo de agendamento do WhatsApp e guiado por botoes/listas (ver
 * whatsapp.queue.ts), o que cobre a maior parte dos casos de forma
 * confiavel. Mas o WhatsApp só permite 3 botoes por mensagem, e o cliente
 * pode digitar em vez de tocar ("sexta de tarde", "pode ser dia 20",
 * "o mais cedo possivel") - antes disso o bot so re-enviava o mesmo menu
 * ignorando o texto. Essa funcao interpreta esse texto livre contra a lista
 * COMPLETA de opcoes validas do passo atual (nao so as 3 mostradas como
 * botao) e devolve o id exato de uma opcao, ou null se nao tiver certeza -
 * nesse caso quem chamou deve cair de volta pro menu normal, sem inventar
 * nada.
 */
export async function matchFreeTextOption(
  stepDescription: string,
  text: string,
  options: Option[]
): Promise<string | null> {
  if (!text.trim() || options.length === 0) return null;

  try {
    const response = await anthropic.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 60,
      system:
        `Voce interpreta UMA mensagem de um cliente de salao de beleza, respondendo em texto livre a pergunta: "${stepDescription}". ` +
        `Va receber uma lista de opcoes validas (id + rotulo) e o texto do cliente. ` +
        `Responda pela ferramenta "select_option" com o id EXATO de uma das opcoes se o texto corresponder claramente a ela ` +
        `(datas relativas como "amanha"/"sexta"/"semana que vem", horarios como "de tarde"/"as 15h"/"o mais cedo possivel", nomes de servico/profissional mesmo com erro de digitacao). ` +
        `Se houver ambiguidade real ou nenhuma opcao bater, responda com id="${NONE}". Nunca invente um id que nao esta na lista.`,
      tools: [
        {
          name: 'select_option',
          description: 'Seleciona a opção que corresponde ao que o cliente quis dizer',
          input_schema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: `Id exato de uma das opções fornecidas, ou "${NONE}" se não tiver certeza`,
              },
            },
            required: ['id'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'select_option' },
      messages: [
        {
          role: 'user',
          content: `Opções válidas:\n${options.map(o => `- id="${o.id}" | ${o.label}`).join('\n')}\n\nMensagem do cliente: "${text}"`,
        },
      ],
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    );
    const id = (toolUse?.input as { id?: string } | undefined)?.id;

    if (id && id !== NONE && options.some(o => o.id === id)) {
      return id;
    }
    return null;
  } catch (error) {
    logger.error({ error }, 'Falha ao interpretar texto livre do agendamento via IA');
    return null;
  }
}
