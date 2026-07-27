import { AgentePapel } from '@prisma/client';

// Os 6 agentes fixos de reuniao. DIRETOR (Renato) comanda os outros 5;
// GESTAO_CORPORATIVA (Marina) organiza dados/pauta. Ordem de criacao importa:
// Renato precisa existir primeiro para os outros apontarem reportsTo para ele.
export const AGENTE_DEFINICOES: Array<{
  papel: AgentePapel;
  nome: string;
  reportaPara: AgentePapel | null;
}> = [
  { papel: 'DIRETOR', nome: 'Renato', reportaPara: null },
  { papel: 'GESTAO_CORPORATIVA', nome: 'Marina', reportaPara: 'DIRETOR' },
  { papel: 'FINANCEIRO', nome: 'Vitor', reportaPara: 'DIRETOR' },
  { papel: 'MARKETING', nome: 'Leo', reportaPara: 'DIRETOR' },
  { papel: 'ATENDIMENTO', nome: 'Ana', reportaPara: 'DIRETOR' },
  { papel: 'TI', nome: 'Theo', reportaPara: 'DIRETOR' },
];
