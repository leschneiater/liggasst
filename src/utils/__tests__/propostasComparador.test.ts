import { describe, expect, it } from 'vitest';
import {
  contarPendentes,
  ordenarParaComparacao,
  textoLinkPropostas,
  validarProposta,
} from '../propostasComparador';

describe('validarProposta', () => {
  it('aceita proposta so com mensagem (valor e prazo a combinar)', () => {
    expect(validarProposta({ amount: null, deadlineDays: null, message: 'Faço o PGR completo em 10 dias.' })).toEqual([]);
  });

  it('exige mensagem com pelo menos 10 caracteres', () => {
    expect(validarProposta({ amount: 100, deadlineDays: 5, message: 'curta' }).length).toBe(1);
  });

  it('rejeita valor negativo', () => {
    expect(validarProposta({ amount: -1, deadlineDays: null, message: 'Proposta válida aqui.' })).toEqual([
      'Informe um valor válido (zero ou maior) ou deixe em branco para combinar.',
    ]);
  });

  it('rejeita prazo nao inteiro ou zero', () => {
    expect(validarProposta({ amount: null, deadlineDays: 0, message: 'Proposta válida aqui.' }).length).toBe(1);
    expect(validarProposta({ amount: null, deadlineDays: 2.5, message: 'Proposta válida aqui.' }).length).toBe(1);
  });

  it('rejeita mensagem acima de 2000 caracteres', () => {
    expect(validarProposta({ amount: null, deadlineDays: null, message: 'x'.repeat(2001) }).length).toBe(1);
  });
});

describe('ordenarParaComparacao', () => {
  it('pendentes primeiro, depois aceitas, recusadas e retiradas; recentes primeiro no grupo', () => {
    const p = (id: string, status: 'pending' | 'accepted' | 'declined' | 'withdrawn', created: string) => ({
      id, status, created_at: created,
    });
    const ordenadas = ordenarParaComparacao([
      p('1', 'declined', '2026-11-01T10:00:00Z'),
      p('2', 'pending', '2026-11-01T09:00:00Z'),
      p('3', 'accepted', '2026-11-01T11:00:00Z'),
      p('4', 'pending', '2026-11-01T12:00:00Z'),
      p('5', 'withdrawn', '2026-11-01T13:00:00Z'),
    ]);
    expect(ordenadas.map((x) => x.id)).toEqual(['4', '2', '3', '1', '5']);
  });
});

describe('contarPendentes', () => {
  it('conta so pendentes', () => {
    expect(contarPendentes([{ status: 'pending' }, { status: 'accepted' }, { status: 'pending' }])).toBe(2);
  });
});

describe('textoLinkPropostas', () => {
  it('singular e plural', () => {
    expect(textoLinkPropostas(1)).toBe('1 proposta');
    expect(textoLinkPropostas(4)).toBe('4 propostas');
  });
});
