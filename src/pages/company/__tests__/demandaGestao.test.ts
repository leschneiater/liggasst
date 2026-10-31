import { describe, it, expect } from 'vitest';
import {
  acoesDaDemanda,
  STATUS_DESTINO_ACAO,
  ROTULOS_STATUS_DEMANDA,
  montarCsvDemandasEmpresa,
  DemandaGestaoRow,
} from '../demandaGestao';

const linha = (extra: Partial<DemandaGestaoRow> = {}): DemandaGestaoRow => ({
  id: 'd1',
  title: 'Elaboração de PGR',
  description: 'Desc',
  service_type: 'PGR',
  city: 'São Paulo',
  state: 'SP',
  budget: 4500,
  deadline: '2026-11-30',
  status: 'active',
  created_at: '2026-10-25T10:00:00Z',
  ...extra,
});

describe('acoesDaDemanda', () => {
  it('demanda ativa pode ser editada, concluída ou cancelada', () => {
    expect(acoesDaDemanda('active')).toEqual(['editar', 'concluir', 'cancelar']);
  });

  it('demandas em outros status não têm ações', () => {
    for (const status of ['draft', 'in_progress', 'completed', 'cancelled']) {
      expect(acoesDaDemanda(status)).toEqual([]);
    }
  });

  it('status desconhecido não ganha ação por engano', () => {
    expect(acoesDaDemanda('qualquer-coisa')).toEqual([]);
  });
});

describe('STATUS_DESTINO_ACAO', () => {
  it('mapeia concluir/cancelar para os status do schema', () => {
    expect(STATUS_DESTINO_ACAO.concluir).toBe('completed');
    expect(STATUS_DESTINO_ACAO.cancelar).toBe('cancelled');
    expect(STATUS_DESTINO_ACAO.editar).toBeUndefined();
  });
});

describe('montarCsvDemandasEmpresa', () => {
  it('gera cabeçalho e linhas com rótulos de status em português', () => {
    const csv = montarCsvDemandasEmpresa([linha(), linha({ id: 'd2', status: 'completed' })]);
    const linhas = csv.split('\n');
    expect(linhas[0]).toBe('"Título";"Tipo de serviço";"Cidade";"UF";"Orçamento (R$)";"Prazo";"Status";"Publicada em"');
    expect(linhas[1]).toContain('"Elaboração de PGR"');
    expect(linhas[1]).toContain(`"${ROTULOS_STATUS_DEMANDA.active}"`);
    expect(linhas[2]).toContain(`"${ROTULOS_STATUS_DEMANDA.completed}"`);
  });

  it('prefixa apóstrofo em células que começam com fórmula de planilha', () => {
    const csv = montarCsvDemandasEmpresa([linha({ title: '=CMD()' })]);
    expect(csv.split('\n')[1]).toContain(`"'=CMD()"`);
  });

  it('escapa aspas duplas e tolera campos nulos', () => {
    const csv = montarCsvDemandasEmpresa([
      linha({ title: 'Laudo "especial"', service_type: null, city: null, state: null, budget: null, deadline: null }),
    ]);
    const corpo = csv.split('\n')[1];
    expect(corpo).toContain('"Laudo ""especial"""');
    expect(corpo).toContain('"";"";""');
  });
});
