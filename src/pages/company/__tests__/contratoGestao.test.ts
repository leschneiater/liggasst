import { describe, expect, it } from 'vitest';
import {
  acoesDoContrato,
  formatarDataContrato,
  formatarMoedaContrato,
  separarContratos,
  textoConfirmacaoContrato,
  tituloDoContrato,
  ContratoRow,
} from '../contratoGestao';

const linha = (status: string, extra: Partial<ContratoRow> = {}): ContratoRow => ({
  id: `c-${status}`,
  demand_id: null,
  company_id: 'e1',
  professional_id: 'p1',
  status,
  title: null,
  amount: null,
  starts_at: null,
  ends_at: null,
  progress: 0,
  created_at: '2026-10-29T10:00:00Z',
  contraparte_nome: 'Contraparte',
  demanda_titulo: null,
  ...extra,
});

describe('acoesDoContrato', () => {
  it('profissional responde proposta pendente; empresa so cancela', () => {
    expect(acoesDoContrato('pending', 'profissional')).toEqual(['aceitar', 'recusar']);
    expect(acoesDoContrato('pending', 'empresa')).toEqual(['cancelar']);
  });

  it('empresa conclui contrato em andamento; qualquer parte cancela', () => {
    expect(acoesDoContrato('in_progress', 'empresa')).toEqual(['concluir', 'cancelar']);
    expect(acoesDoContrato('in_progress', 'profissional')).toEqual(['cancelar']);
  });

  it('contrato encerrado nao tem acoes (historico imutavel)', () => {
    expect(acoesDoContrato('completed', 'empresa')).toEqual([]);
    expect(acoesDoContrato('completed', 'profissional')).toEqual([]);
    expect(acoesDoContrato('cancelled', 'empresa')).toEqual([]);
    expect(acoesDoContrato('cancelled', 'profissional')).toEqual([]);
  });
});

describe('tituloDoContrato', () => {
  it('prefere o titulo proprio, depois o da demanda, depois o generico', () => {
    expect(tituloDoContrato({ title: 'Consultoria', demanda_titulo: 'PGR' })).toBe('Consultoria');
    expect(tituloDoContrato({ title: null, demanda_titulo: 'PGR matriz' })).toBe('PGR matriz');
    expect(tituloDoContrato({ title: '  ', demanda_titulo: null })).toBe('Contrato de serviço');
  });
});

describe('textoConfirmacaoContrato', () => {
  it('aceite com demanda avisa que ela sai da vitrine', () => {
    expect(textoConfirmacaoContrato('aceitar', { temDemanda: true, emAndamento: false }))
      .toContain('sai da vitrine');
  });

  it('cancelar em andamento devolve a demanda a vitrine; pendente nao mexe nela', () => {
    expect(textoConfirmacaoContrato('cancelar', { temDemanda: true, emAndamento: true }))
      .toContain('volta à vitrine');
    expect(textoConfirmacaoContrato('cancelar', { temDemanda: true, emAndamento: false }))
      .toContain('continua na vitrine');
  });

  it('concluir avisa que a demanda e concluida junto', () => {
    expect(textoConfirmacaoContrato('concluir', { temDemanda: true, emAndamento: true }))
      .toContain('demanda vinculada também será concluída');
  });
});

describe('formatadores', () => {
  it('formata moeda em pt-BR com duas casas', () => {
    expect(formatarMoedaContrato(4500)).toBe('R$ 4.500,00');
    expect(formatarMoedaContrato(null)).toBeNull();
  });

  it('formata data sem virar o dia pelo fuso', () => {
    expect(formatarDataContrato('2026-11-10')).toBe('10/11/2026');
    expect(formatarDataContrato(null)).toBeNull();
  });
});

describe('separarContratos', () => {
  it('agrupa por etapa do fluxo', () => {
    const grupos = separarContratos([
      linha('pending'),
      linha('in_progress'),
      linha('completed'),
      linha('cancelled'),
    ]);
    expect(grupos.pendentes.map((c) => c.status)).toEqual(['pending']);
    expect(grupos.emAndamento.map((c) => c.status)).toEqual(['in_progress']);
    expect(grupos.historico.map((c) => c.status)).toEqual(['completed', 'cancelled']);
  });
});
