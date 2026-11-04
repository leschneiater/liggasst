import { describe, it, expect } from 'vitest';
import {
  rotuloStatusAtribuicao,
  rotuloVinculo,
  progressoDaEquipe,
  atribuicoesDoFuncionario,
} from '../capacitacaoEquipe';
import type { AtribuicaoTreinamento } from '../../services/capacitacaoEquipe';

const atr = (id: string, ceid: string, status: 'assigned' | 'completed'): AtribuicaoTreinamento => ({
  id,
  company_employee_id: ceid,
  training_id: `t-${id}`,
  status,
  assigned_at: '2026-11-04T10:00:00Z',
  completed_at: status === 'completed' ? '2026-11-04T12:00:00Z' : null,
});

describe('rotuloStatusAtribuicao', () => {
  it('rotula pendente e concluido', () => {
    expect(rotuloStatusAtribuicao('assigned')).toBe('Pendente');
    expect(rotuloStatusAtribuicao('completed')).toBe('Concluído');
  });
});

describe('rotuloVinculo', () => {
  it('distingue desativado, vinculado e convite pendente', () => {
    expect(rotuloVinculo({ active: false, employee_profile_id: 'p1' })).toBe('Desativado');
    expect(rotuloVinculo({ active: true, employee_profile_id: 'p1' })).toBe('Conta vinculada');
    expect(rotuloVinculo({ active: true, employee_profile_id: null })).toBe('Convite pendente');
  });
});

describe('progressoDaEquipe', () => {
  it('conta concluidos e percentual inteiro', () => {
    const p = progressoDaEquipe([
      atr('1', 'e1', 'completed'),
      atr('2', 'e1', 'assigned'),
      atr('3', 'e2', 'completed'),
    ]);
    expect(p).toEqual({ total: 3, concluidos: 2, percentual: 67 });
  });
  it('sem atribuicoes: zero sem divisao por zero', () => {
    expect(progressoDaEquipe([])).toEqual({ total: 0, concluidos: 0, percentual: 0 });
  });
});

describe('atribuicoesDoFuncionario', () => {
  it('filtra pela linha da equipe', () => {
    const lista = [atr('1', 'e1', 'assigned'), atr('2', 'e2', 'assigned'), atr('3', 'e1', 'completed')];
    expect(atribuicoesDoFuncionario(lista, 'e1').map((a) => a.id)).toEqual(['1', '3']);
    expect(atribuicoesDoFuncionario(lista, 'e3')).toEqual([]);
  });
});
