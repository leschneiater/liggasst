// Regras puras do calendario de conformidade: saude por validade (30 dias
// de alerta), ordenacao (alertas primeiro) e texto do banner in-app.
import { describe, it, expect } from 'vitest';
import {
  ItemConformidade,
  diasParaVencer,
  ordenarItens,
  resumoSaude,
  saudeItem,
  textoAlertaConformidade,
} from '../calendarioConformidade';

const HOJE = new Date('2026-11-04T12:00:00');

const item = (id: string, validade: string): ItemConformidade => ({
  id,
  company_id: 'emp-1',
  titulo: `Doc ${id}`,
  tipo: 'PGR',
  validade,
  responsavel: null,
  observacoes: null,
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z',
});

describe('diasParaVencer', () => {
  it('conta dias cheios ate a validade', () => {
    expect(diasParaVencer('2026-11-04', HOJE)).toBe(0);
    expect(diasParaVencer('2026-11-05', HOJE)).toBe(1);
    expect(diasParaVencer('2026-11-03', HOJE)).toBe(-1);
  });
});

describe('saudeItem', () => {
  it('vencido quando a validade passou', () => {
    expect(saudeItem('2026-11-03', HOJE)).toBe('vencido');
  });
  it('a_vencer hoje e ate 30 dias', () => {
    expect(saudeItem('2026-11-04', HOJE)).toBe('a_vencer');
    expect(saudeItem('2026-12-04', HOJE)).toBe('a_vencer'); // exatos 30 dias
  });
  it('em_dia acima de 30 dias', () => {
    expect(saudeItem('2026-12-05', HOJE)).toBe('em_dia');
  });
});

describe('ordenarItens', () => {
  it('alertas primeiro (vencido, a vencer), cada grupo por validade', () => {
    const lista = [
      item('em-dia', '2027-01-10'),
      item('a-vencer-b', '2026-11-20'),
      item('vencido-b', '2026-10-01'),
      item('vencido-a', '2026-09-01'),
      item('a-vencer-a', '2026-11-06'),
    ];
    expect(ordenarItens(lista, HOJE).map((i) => i.id)).toEqual([
      'vencido-a',
      'vencido-b',
      'a-vencer-a',
      'a-vencer-b',
      'em-dia',
    ]);
  });
});

describe('resumoSaude + textoAlertaConformidade', () => {
  it('resume por faixa e monta o texto do banner', () => {
    const lista = [
      item('v1', '2026-10-01'),
      item('v2', '2026-10-02'),
      item('a1', '2026-11-10'),
      item('ok', '2027-05-01'),
    ];
    const r = resumoSaude(lista, HOJE);
    expect(r).toEqual({ vencidos: 2, aVencer: 1, emDia: 1 });
    expect(textoAlertaConformidade(r)).toBe(
      'Conformidade: 2 documentos vencidos e 1 documento vence em até 30 dias.',
    );
  });
  it('singular e so uma faixa', () => {
    const r = resumoSaude([item('a1', '2026-11-10')], HOJE);
    expect(textoAlertaConformidade(r)).toBe('Conformidade: 1 documento vence em até 30 dias.');
  });
});

describe('gradeDoMes', () => {
  it('novembro/2026 comeca num domingo: primeira semana tem 6 dias de outubro', async () => {
    const { gradeDoMes } = await import('../calendarioConformidade');
    const grade = gradeDoMes(2026, 10); // mes 0-based: novembro
    expect(grade[0][0].iso).toBe('2026-10-26'); // segunda anterior
    expect(grade[0][6].iso).toBe('2026-11-01'); // domingo, 1o do mes
    expect(grade[0][6].noMes).toBe(true);
    expect(grade[0][5].noMes).toBe(false);
    const ultima = grade[grade.length - 1];
    expect(ultima[0].iso).toBe('2026-11-30'); // 30/11 e segunda
    expect(ultima[6].iso).toBe('2026-12-06');
    expect(grade.every((sem) => sem.length === 7)).toBe(true);
  });
  it('todo dia do mes aparece exatamente uma vez', async () => {
    const { gradeDoMes } = await import('../calendarioConformidade');
    const grade = gradeDoMes(2026, 1); // fevereiro/2026
    const dias = grade.flat().filter((d) => d.noMes).map((d) => d.dia);
    expect(dias).toEqual(Array.from({ length: 28 }, (_, i) => i + 1));
  });
});

describe('diasDaSemana / inicioDaSemana', () => {
  it('semana comeca na segunda e tem 7 dias', async () => {
    const { diasDaSemana } = await import('../calendarioConformidade');
    // 04/11/2026 e quarta-feira
    const dias = diasDaSemana(new Date('2026-11-04T12:00:00'));
    expect(dias[0].iso).toBe('2026-11-02');
    expect(dias[6].iso).toBe('2026-11-08');
  });
  it('domingo pertence a semana que comecou na segunda anterior', async () => {
    const { diasDaSemana } = await import('../calendarioConformidade');
    const dias = diasDaSemana(new Date('2026-11-08T12:00:00'));
    expect(dias[0].iso).toBe('2026-11-02');
  });
});

describe('rotuloSemana', () => {
  it('mesmo mes e virada de mes', async () => {
    const { rotuloSemana, diasDaSemana } = await import('../calendarioConformidade');
    expect(rotuloSemana(diasDaSemana(new Date('2026-11-04T12:00:00')))).toBe('2 a 8 de novembro de 2026');
    expect(rotuloSemana(diasDaSemana(new Date('2026-11-30T12:00:00')))).toBe('30 de novembro a 6 de dezembro de 2026');
  });
});

describe('itensPorData', () => {
  it('agrupa pela validade', async () => {
    const { itensPorData } = await import('../calendarioConformidade');
    const mapa = itensPorData([item('a', '2026-11-10'), item('b', '2026-11-10'), item('c', '2026-12-01')]);
    expect(mapa['2026-11-10'].map((i) => i.id)).toEqual(['a', 'b']);
    expect(mapa['2026-12-01']).toHaveLength(1);
  });
});
