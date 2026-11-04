import { describe, expect, it } from 'vitest';
import {
  podeConcluirSecao,
  resumoProgresso,
  trilhaConcluida,
  formatarDataLiberacao,
  situacaoProva,
} from '../trilhas';

describe('resumoProgresso', () => {
  it('formata "2 de 5 seções"', () => {
    expect(resumoProgresso(5, 2)).toBe('2 de 5 seções');
  });
  it('singular para 1 seção', () => {
    expect(resumoProgresso(1, 0)).toBe('0 de 1 seção');
  });
  it('sem seções', () => {
    expect(resumoProgresso(0, 0)).toBe('Sem seções');
  });
  it('nunca passa do total', () => {
    expect(resumoProgresso(3, 7)).toBe('3 de 3 seções');
  });
});

describe('podeConcluirSecao', () => {
  it('bloqueia antes de abrir o conteúdo', () => {
    expect(podeConcluirSecao('s1', new Set(), new Set())).toBe(false);
  });
  it('habilita depois de abrir o conteúdo nesta visita', () => {
    expect(podeConcluirSecao('s1', new Set(['s1']), new Set())).toBe(true);
  });
  it('nunca reabilita seção já concluída', () => {
    expect(podeConcluirSecao('s1', new Set(['s1']), new Set(['s1']))).toBe(false);
  });
  it('abrir outra seção não habilita esta', () => {
    expect(podeConcluirSecao('s1', new Set(['s2']), new Set())).toBe(false);
  });
});

describe('trilhaConcluida', () => {
  it('completa quando todas as seções têm progresso', () => {
    expect(trilhaConcluida(2, 2)).toBe(true);
  });
  it('incompleta com seções pendentes', () => {
    expect(trilhaConcluida(5, 4)).toBe(false);
  });
  it('trilha sem seções nunca está concluída', () => {
    expect(trilhaConcluida(0, 0)).toBe(false);
  });
});

describe('situacaoProva', () => {
  it('sem tentativa: livre', () => {
    expect(situacaoProva(null)).toEqual({ tipo: 'livre' });
  });
  it('tentativa em andamento: livre (pode retomar)', () => {
    expect(situacaoProva({ finished_at: null, passed: null, score: null, locked_until: null }))
      .toEqual({ tipo: 'livre' });
  });
  it('aprovado guarda a nota', () => {
    expect(situacaoProva({ finished_at: '2026-11-04T20:00:00Z', passed: true, score: 80, locked_until: null }))
      .toEqual({ tipo: 'aprovado', score: 80 });
  });
  it('reprovado com cadeado no futuro: bloqueado', () => {
    const futuro = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    expect(situacaoProva({ finished_at: '2026-11-04T20:00:00Z', passed: false, score: 60, locked_until: futuro }))
      .toEqual({ tipo: 'bloqueado', lockedUntil: futuro });
  });
  it('reprovado com cadeado vencido: livre de novo', () => {
    const passado = new Date(Date.now() - 1000).toISOString();
    expect(situacaoProva({ finished_at: '2026-10-28T20:00:00Z', passed: false, score: 60, locked_until: passado }))
      .toEqual({ tipo: 'livre' });
  });
});

describe('formatarDataLiberacao', () => {
  it('formata dia e mes em pt-BR', () => {
    const texto = formatarDataLiberacao('2026-11-12T12:00:00Z');
    expect(texto).toContain('12');
    expect(texto.toLowerCase()).toContain('novembro');
  });
});
