import { Agente } from '@prisma/client';
import { prisma } from '../../config';
import { AGENTE_DEFINICOES } from './agentes.constants';

export class AgentesService {
  /**
   * Cria os 6 agentes fixos para um business, caso ainda nao existam.
   * Idempotente: pode ser chamado toda vez que um business e criado ou
   * onboardado sem duplicar nada. Cria o DIRETOR (Renato) primeiro, porque
   * os outros 5 precisam do id dele para montar a hierarquia (reportsToId).
   */
  async ensureAgentesForBusiness(businessId: string): Promise<Agente[]> {
    const existentes = await prisma.agente.findMany({ where: { businessId } });
    const existentesPorPapel = new Map(existentes.map(a => [a.papel, a]));

    const diretor =
      existentesPorPapel.get('DIRETOR') ??
      (await prisma.agente.create({
        data: { businessId, papel: 'DIRETOR', nome: 'Renato' },
      }));
    existentesPorPapel.set('DIRETOR', diretor);

    for (const def of AGENTE_DEFINICOES) {
      if (def.papel === 'DIRETOR' || existentesPorPapel.has(def.papel)) continue;

      const criado = await prisma.agente.create({
        data: {
          businessId,
          papel: def.papel,
          nome: def.nome,
          reportsToId: diretor.id,
        },
      });
      existentesPorPapel.set(def.papel, criado);
    }

    return prisma.agente.findMany({ where: { businessId }, orderBy: { papel: 'asc' } });
  }

  async listByBusiness(businessId: string) {
    return prisma.agente.findMany({
      where: { businessId },
      orderBy: { papel: 'asc' },
    });
  }

  /**
   * Monta o system prompt de um agente com o guarda-corpo contra
   * "capacidade alucinada": o agente so pode citar capacidadesAtivas como
   * coisas que ele executa de verdade. capacidadesPlanejadas so pode ser
   * mencionada como roadmap, nunca executada. Ver agents/kai/AGENT.md na
   * raiz do ecossistema para o desenho completo dessa regra.
   */
  buildSystemPrompt(agente: Pick<Agente, 'nome' | 'papel' | 'capacidadesAtivas' | 'capacidadesPlanejadas'>): string {
    const ativas = agente.capacidadesAtivas.length
      ? agente.capacidadesAtivas.map(c => `- ${c}`).join('\n')
      : '- (nenhuma capacidade extra ativada ainda alem do papel base)';

    const planejadas = agente.capacidadesPlanejadas.length
      ? agente.capacidadesPlanejadas.map(c => `- ${c}`).join('\n')
      : '- (nada no roadmap por enquanto)';

    return [
      `Voce e ${agente.nome}, agente de ${agente.papel} do bela360.`,
      '',
      'Capacidades que voce PODE executar de verdade agora:',
      ativas,
      '',
      'Capacidades planejadas (roadmap), que voce NAO pode executar:',
      planejadas,
      '',
      'Regra de seguranca, sem excecao: nunca aja como se uma capacidade',
      'existisse fora da lista de "capacidades que voce PODE executar" acima.',
      'Se alguem pedir algo que so esta no roadmap, diga claramente que ainda',
      'nao esta disponivel e que esta planejado - nunca finja que executou.',
    ].join('\n');
  }
}

export const agentesService = new AgentesService();
