import { AgentePapel, AmbientePropagacao, Integracao, IntegracaoStatus } from '@prisma/client';
import { prisma } from '../../config';
import { AppError, NotFoundError } from '../../common/errors';

interface CreateIntegracaoInput {
  nome: string;
  dominioPlataforma: string;
  descricao?: string;
  agentePapelAlvo: AgentePapel;
}

/**
 * Kai e o agente de infraestrutura do ecossistema WayIA: conecta plataformas
 * prontas (ex: criar.wayia.com.br) aos 6 agentes de reuniao do bela360.
 * Ele nao participa de reuniao nenhuma e fica fora da hierarquia deles.
 *
 * Regra central: em_teste ativa sozinho (sandbox, risco baixo); pronta_producao
 * sempre para numa AprovacaoKai pendente ate o Anderson decidir. Toda ativacao
 * gera um LogPropagacaoKai, sem excecao.
 */
export class KaiService {
  async listIntegracoes() {
    return prisma.integracao.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createIntegracao(input: CreateIntegracaoInput): Promise<Integracao> {
    return prisma.integracao.create({
      data: {
        nome: input.nome,
        dominioPlataforma: input.dominioPlataforma,
        descricao: input.descricao,
        agentePapelAlvo: input.agentePapelAlvo,
        status: 'PLANEJADA',
      },
    });
  }

  /**
   * Muda o status de uma integracao e deixa o Kai reagir. E o ponto de
   * deteccao mencionado na especificacao: nao existe fila/webhook separado
   * neste sistema, entao a propria mudanca de status ja dispara o Kai.
   */
  async updateStatus(integracaoId: string, novoStatus: IntegracaoStatus) {
    const integracao = await prisma.integracao.findUnique({ where: { id: integracaoId } });
    if (!integracao) throw new NotFoundError('Integracao');

    const atualizada = await prisma.integracao.update({
      where: { id: integracaoId },
      data: { status: novoStatus },
    });

    if (novoStatus === 'EM_TESTE') {
      await this.activateSandbox(atualizada);
    } else if (novoStatus === 'PRONTA_PRODUCAO') {
      await this.requestProductionApproval(atualizada);
    }

    return atualizada;
  }

  /**
   * em_teste: ativa sozinho, sem aprovacao, so nos negocios marcados como
   * conta de teste (Business.isTestAccount).
   */
  private async activateSandbox(integracao: Integracao) {
    const agentesAlvo = await prisma.agente.findMany({
      where: {
        papel: integracao.agentePapelAlvo,
        isActive: true,
        business: { isTestAccount: true },
      },
    });

    for (const agente of agentesAlvo) {
      await this.ativarCapacidadeNoAgente(agente.id, integracao, 'SANDBOX');
    }
  }

  /**
   * pronta_producao: nunca ativa sozinho. Abre um pedido de aprovacao
   * (se ja nao houver um pendente para esta integracao) e espera o Anderson.
   */
  private async requestProductionApproval(integracao: Integracao) {
    const jaPendente = await prisma.aprovacaoKai.findFirst({
      where: { integracaoId: integracao.id, status: 'PENDENTE' },
    });
    if (jaPendente) return jaPendente;

    return prisma.aprovacaoKai.create({
      data: {
        integracaoId: integracao.id,
        agentePapelAlvo: integracao.agentePapelAlvo,
        status: 'PENDENTE',
      },
    });
  }

  async listAprovacoes(status?: 'PENDENTE' | 'APROVADO' | 'REJEITADO') {
    return prisma.aprovacaoKai.findMany({
      where: status ? { status } : undefined,
      include: { integracao: true },
      orderBy: { solicitadoEm: 'desc' },
    });
  }

  async approve(aprovacaoId: string, decididoPorId: string) {
    const aprovacao = await prisma.aprovacaoKai.findUnique({
      where: { id: aprovacaoId },
      include: { integracao: true },
    });
    if (!aprovacao) throw new NotFoundError('Pedido de aprovacao');
    if (aprovacao.status !== 'PENDENTE') {
      throw new AppError('Este pedido ja foi decidido', 409, 'APROVACAO_JA_DECIDIDA');
    }

    await prisma.aprovacaoKai.update({
      where: { id: aprovacaoId },
      data: { status: 'APROVADO', decididoPorId, decididoEm: new Date() },
    });

    // So agora, com aprovacao explicita, ativa em producao (clientes reais)
    const agentesAlvo = await prisma.agente.findMany({
      where: {
        papel: aprovacao.integracao.agentePapelAlvo,
        isActive: true,
        business: { isTestAccount: false },
      },
    });

    for (const agente of agentesAlvo) {
      await this.ativarCapacidadeNoAgente(agente.id, aprovacao.integracao, 'PRODUCAO', aprovacaoId);
    }

    return prisma.aprovacaoKai.findUniqueOrThrow({ where: { id: aprovacaoId } });
  }

  async reject(aprovacaoId: string, decididoPorId: string, motivo?: string) {
    const aprovacao = await prisma.aprovacaoKai.findUnique({ where: { id: aprovacaoId } });
    if (!aprovacao) throw new NotFoundError('Pedido de aprovacao');
    if (aprovacao.status !== 'PENDENTE') {
      throw new AppError('Este pedido ja foi decidido', 409, 'APROVACAO_JA_DECIDIDA');
    }

    return prisma.aprovacaoKai.update({
      where: { id: aprovacaoId },
      data: {
        status: 'REJEITADO',
        decididoPorId,
        decididoEm: new Date(),
        motivoRejeicao: motivo,
      },
    });
  }

  async listLogs(integracaoId?: string) {
    return prisma.logPropagacaoKai.findMany({
      where: integracaoId ? { integracaoId } : undefined,
      include: {
        integracao: { select: { nome: true, dominioPlataforma: true } },
        agente: { select: { nome: true, papel: true, businessId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Ativa a capacidade da integracao num agente especifico e deixa o
   * rastro obrigatorio em log_propagacao_kai. Idempotente: se o agente ja
   * tem essa capacidade ativa, nao duplica nem no array nem no log.
   */
  private async ativarCapacidadeNoAgente(
    agenteId: string,
    integracao: Integracao,
    ambiente: AmbientePropagacao,
    aprovacaoId?: string
  ) {
    const agente = await prisma.agente.findUniqueOrThrow({ where: { id: agenteId } });
    if (agente.capacidadesAtivas.includes(integracao.nome)) return;

    await prisma.$transaction([
      prisma.agente.update({
        where: { id: agenteId },
        data: { capacidadesAtivas: { push: integracao.nome } },
      }),
      prisma.logPropagacaoKai.create({
        data: {
          integracaoId: integracao.id,
          agenteId,
          ambiente,
          aprovacaoId,
        },
      }),
    ]);
  }
}

export const kaiService = new KaiService();
