/** Tipos, textos padrao e variaveis das mensagens do marketplace. Puro (sem banco), testado em messages.test.ts. */

export type MessageType = 'PEDIDO_PAGO' | 'PEDIDO_ENVIADO' | 'PEDIDO_ENTREGUE' | 'CASHBACK_LIBERADO' | 'PEDIDO_ESTORNADO' | 'NOVO_PEDIDO';
export type Channel = 'WHATSAPP' | 'EMAIL';
export type Audience = 'CLIENTE' | 'DISTRIBUIDOR';
export type Var = 'nome' | 'pedido' | 'valor' | 'cashback' | 'distribuidor';

export const MESSAGE_TYPES: MessageType[] = ['PEDIDO_PAGO', 'PEDIDO_ENVIADO', 'PEDIDO_ENTREGUE', 'CASHBACK_LIBERADO', 'PEDIDO_ESTORNADO', 'NOVO_PEDIDO'];

export const AUDIENCE_OF: Record<MessageType, Audience> = {
  PEDIDO_PAGO: 'CLIENTE', PEDIDO_ENVIADO: 'CLIENTE', PEDIDO_ENTREGUE: 'CLIENTE',
  CASHBACK_LIBERADO: 'CLIENTE', PEDIDO_ESTORNADO: 'CLIENTE', NOVO_PEDIDO: 'DISTRIBUIDOR',
};

/** Ordem das variaveis = ordem dos parametros {{1}}, {{2}}... do template aprovado na Meta. */
export const WA_VARS: Record<MessageType, Var[]> = {
  PEDIDO_PAGO: ['nome', 'pedido', 'valor'],
  PEDIDO_ENVIADO: ['nome', 'pedido', 'distribuidor'],
  PEDIDO_ENTREGUE: ['nome', 'pedido', 'cashback'],
  CASHBACK_LIBERADO: ['nome', 'pedido', 'cashback'],
  PEDIDO_ESTORNADO: ['nome', 'pedido', 'valor'],
  NOVO_PEDIDO: ['distribuidor', 'pedido', 'valor'],
};

export const DEFAULT_BODIES: Record<MessageType, { subject: string; body: string }> = {
  PEDIDO_PAGO: { subject: 'Pagamento confirmado do pedido #{pedido}', body: 'Ola, {nome}! Recebemos o pagamento de {valor} do pedido #{pedido} no Marketplace Bela 360. Avisaremos quando for enviado.' },
  PEDIDO_ENVIADO: { subject: 'Pedido #{pedido} a caminho', body: 'Ola, {nome}! Seu pedido #{pedido} foi enviado por {distribuidor}.' },
  PEDIDO_ENTREGUE: { subject: 'Pedido #{pedido} entregue', body: 'Ola, {nome}! O pedido #{pedido} foi entregue. Seu cashback de {cashback} sera liberado ao fim do prazo de devolucao.' },
  CASHBACK_LIBERADO: { subject: 'Seu cashback foi liberado', body: 'Ola, {nome}! O cashback de {cashback} do pedido #{pedido} ja esta disponivel no seu saldo.' },
  PEDIDO_ESTORNADO: { subject: 'Pedido #{pedido} estornado', body: 'Ola, {nome}! O pedido #{pedido} foi estornado no valor de {valor}.' },
  NOVO_PEDIDO: { subject: 'Novo pedido #{pedido}', body: 'Ola, {distribuidor}! Novo pedido #{pedido} no valor de {valor} pelo Marketplace Bela 360.' },
};

export const brl = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;

export function render(tpl: string, vars: Partial<Record<Var, string>>): string {
  return tpl.replace(/\{(nome|pedido|valor|cashback|distribuidor)\}/g, (_m, k: Var) => vars[k] ?? '');
}

/** Valores (na ordem do template Meta) para os parametros do WhatsApp. */
export function waParams(type: MessageType, vars: Partial<Record<Var, string>>): string[] {
  return WA_VARS[type].map(k => vars[k] || '-');
}

/** Telefone BR para E.164 sem '+': 10/11 digitos ganham 55; invalido = null. */
export function normalizePhoneBR(raw: string | null | undefined): string | null {
  const d = (raw ?? '').replace(/\D/g, '');
  const full = d.length === 10 || d.length === 11 ? `55${d}` : d;
  return /^55\d{10,11}$/.test(full) ? full : null;
}

export const looksLikeEmail = (s: string | null | undefined): s is string => !!s && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

export const defaultWaTemplateName = (type: MessageType) => `bela360_mk_${type.toLowerCase()}`;
