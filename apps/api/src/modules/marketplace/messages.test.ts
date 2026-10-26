import { describe, it, expect } from 'vitest';
import { AUDIENCE_OF, MESSAGE_TYPES, WA_VARS, DEFAULT_BODIES, brl, looksLikeEmail, normalizePhoneBR, render, waParams } from './messages.templates';

describe('mensagens: templates puros', () => {
  it('formata valores e substitui variaveis', () => {
    expect(brl(123456)).toBe('R$ 1234,56');
    expect(render('Ola {nome}, #{pedido} {valor}', { nome: 'Ana', pedido: '7', valor: brl(1000) })).toBe('Ola Ana, #7 R$ 10,00');
  });
  it('todo tipo tem destinatario, texto e variaveis do WhatsApp usadas no texto padrao', () => {
    for (const t of MESSAGE_TYPES) {
      expect(AUDIENCE_OF[t]).toBeTruthy();
      for (const v of WA_VARS[t]) expect(DEFAULT_BODIES[t].body).toContain(`{${v}}`);
    }
  });
  it('parametros do WhatsApp seguem a ordem do template e nunca ficam vazios', () => {
    expect(waParams('PEDIDO_PAGO', { nome: 'Ana', pedido: '7', valor: 'R$ 1,00' })).toEqual(['Ana', '7', 'R$ 1,00']);
    expect(waParams('PEDIDO_ENVIADO', { nome: 'Ana', pedido: '7' })).toEqual(['Ana', '7', '-']);
  });
  it('telefone BR e e-mail', () => {
    expect(normalizePhoneBR('(11) 98888-7777')).toBe('5511988887777');
    expect(normalizePhoneBR('+55 11 3888-7777')).toBe('551138887777');
    expect(normalizePhoneBR('123')).toBeNull();
    expect(looksLikeEmail('a@b.co')).toBe(true);
    expect(looksLikeEmail('11 99999')).toBe(false);
  });
});
