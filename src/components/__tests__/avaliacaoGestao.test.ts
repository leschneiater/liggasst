import { describe, it, expect } from 'vitest';
import {
  estadoAvaliacaoContrato,
  estrelasDaNota,
  formatarMedia,
  mensagemErroAvaliacao,
  notaValida,
  textoResumoAvaliacoes,
} from '../contratos/avaliacaoGestao';

describe('avaliacaoGestao', () => {
  it('valida notas de 1 a 5 inteiras', () => {
    expect(notaValida(1)).toBe(true);
    expect(notaValida(5)).toBe(true);
    expect(notaValida(0)).toBe(false);
    expect(notaValida(6)).toBe(false);
    expect(notaValida(3.5)).toBe(false);
    expect(notaValida(NaN)).toBe(false);
  });

  it('monta o vetor de estrelas preenchidas', () => {
    expect(estrelasDaNota(3)).toEqual([true, true, true, false, false]);
    expect(estrelasDaNota(0)).toEqual([false, false, false, false, false]);
    expect(estrelasDaNota(5)).toEqual([true, true, true, true, true]);
  });

  it('formata média em pt-BR e ausência de média', () => {
    expect(formatarMedia(4.5)).toBe('4,5');
    expect(formatarMedia(5)).toBe('5,0');
    expect(formatarMedia(null)).toBe('—');
    expect(formatarMedia(undefined)).toBe('—');
  });

  it('resume média e total com singular/plural', () => {
    expect(textoResumoAvaliacoes(null, 0)).toBe('Ainda sem avaliações');
    expect(textoResumoAvaliacoes(5, 1)).toBe('5,0 de 5 · 1 avaliação');
    expect(textoResumoAvaliacoes(4.5, 2)).toBe('4,5 de 5 · 2 avaliações');
  });

  it('resolve o estado da avaliação do contrato', () => {
    expect(estadoAvaliacaoContrato('in_progress', false, false, false)).toBe('nao-concluido');
    expect(estadoAvaliacaoContrato('completed', true, false, false)).toBe('pode-avaliar');
    expect(estadoAvaliacaoContrato('completed', false, true, false)).toBe('enviada-oculta');
    expect(estadoAvaliacaoContrato('completed', false, true, true)).toBe('revelada');
    expect(estadoAvaliacaoContrato('completed', false, false, false)).toBe('prazo-encerrado');
  });

  it('traduz erros das RPCs para mensagens amigáveis', () => {
    expect(mensagemErroAvaliacao('o prazo para avaliar este contrato terminou')).toContain('14 dias');
    expect(mensagemErroAvaliacao('voce ja avaliou este contrato')).toBe('Você já avaliou este contrato.');
    expect(mensagemErroAvaliacao('avaliacao ja revelada nao pode mais ser alterada')).toContain('revelada');
    expect(mensagemErroAvaliacao('so e possivel avaliar contratos concluidos')).toContain('concluídos');
    expect(mensagemErroAvaliacao('erro desconhecido')).toContain('Não foi possível');
  });
});
