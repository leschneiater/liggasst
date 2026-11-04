import { describe, expect, it } from 'vitest';
import {
  podeConcluirSecao,
  resumoProgresso,
  trilhaConcluida,
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
