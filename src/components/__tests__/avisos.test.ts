import { describe, it, expect } from 'vitest';
import {
  contarMensagensNaoLidas,
  contarPropostasParaResponder,
  rotuloContador,
  textoMensagensNovas,
  textoPropostasPendentes,
} from '../../utils/avisos';

describe('avisos', () => {
  it('conta so mensagens recebidas e nao lidas', () => {
    const msgs = [
      { receiver_id: 'eu', read: false },
      { receiver_id: 'eu', read: null },
      { receiver_id: 'eu', read: true },
      { receiver_id: 'outro', read: false },
    ];
    expect(contarMensagensNaoLidas(msgs, 'eu')).toBe(2);
    expect(contarMensagensNaoLidas(msgs, '')).toBe(0);
  });

  it('proposta pendente so avisa o profissional', () => {
    const contratos = [{ status: 'pending' }, { status: 'pending' }, { status: 'in_progress' }, { status: 'cancelled' }];
    expect(contarPropostasParaResponder(contratos, 'profissional')).toBe(2);
    expect(contarPropostasParaResponder(contratos, 'empresa')).toBe(0);
  });

  it('formata contador e textos', () => {
    expect(rotuloContador(3)).toBe('3');
    expect(rotuloContador(12)).toBe('9+');
    expect(textoMensagensNovas(1)).toBe('1 mensagem nova');
    expect(textoMensagensNovas(2)).toBe('2 mensagens novas');
    expect(textoPropostasPendentes(1)).toContain('1 proposta de contrato');
    expect(textoPropostasPendentes(2)).toContain('2 propostas de contrato');
  });
});
