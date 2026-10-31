import { describe, it, expect } from 'vitest';
import {
  montarFeedAtividade,
  principaisRegioes,
  filtrarDemandasVisiveis,
  demandasNoPeriodo,
} from '../adminDados';
import type { AdminMemberRow, AdminDemandRow, ReportRow } from '../../../services/database';

const membro = (partial: Partial<AdminMemberRow>): AdminMemberRow => ({
  id: 'm1', role: 'professional', display_name: 'Ana', email: 'a@a.com', phone: null,
  city: null, state: null, created_at: '2026-10-01T10:00:00Z', education: null,
  specialization: null, experience: null, hourly_rate: null, segment: null,
  employee_count: null, responsible_name: null, responsible_email: null,
  responsible_phone: null, ...partial,
});

const demanda = (id: string, created_at: string, company_id = 'e1', title = 'Laudo'): AdminDemandRow => ({
  id, title, company_id, service_type: null, city: null, state: null,
  budget: null, deadline: null, status: 'active', created_at,
});

const denuncia = (id: string, created_at: string): ReportRow => ({
  id, reporter_id: 'a', reported_id: 'b', message_id: null, reason: 'spam',
  details: null, status: 'open', created_at,
});

describe('montarFeedAtividade', () => {
  it('ordena por data desc, limita e rotula cada tipo', () => {
    const feed = montarFeedAtividade(
      [membro({ id: 'p1', display_name: 'Ana', created_at: '2026-10-02T00:00:00Z' }),
       membro({ id: 'e1', role: 'company', display_name: 'ACME', created_at: '2026-10-05T00:00:00Z' }),
       membro({ id: 'adm', role: 'admin', display_name: 'Root', created_at: '2026-10-06T00:00:00Z' })],
      [demanda('d1', '2026-10-04T00:00:00Z')],
      [denuncia('r1', '2026-10-03T00:00:00Z')],
    );
    expect(feed.map(f => f.id)).toEqual(['cadastro-e1', 'demanda-d1', 'denuncia-r1', 'cadastro-p1']);
    expect(feed[0].descricao).toBe('Nova empresa cadastrada: ACME');
    // admin nao vira evento de cadastro
    expect(feed.find(f => f.id === 'cadastro-adm')).toBeUndefined();
  });

  it('nao inclui demanda de empresa fora dos membros visiveis (teste/removida)', () => {
    const feed = montarFeedAtividade(
      [membro({ id: 'e1', role: 'company', display_name: 'ACME' })],
      [demanda('d1', '2026-10-04T00:00:00Z'), demanda('dTeste', '2026-10-06T00:00:00Z', 'empresa-teste')],
      [],
    );
    expect(feed.map(f => f.id)).toEqual(['demanda-d1', 'cadastro-e1']);
  });
});

describe('filtrarDemandasVisiveis / demandasNoPeriodo', () => {
  it('mantem so demandas de empresas visiveis e conta o periodo sobre elas', () => {
    const membros = [membro({ id: 'e1', role: 'company' }), membro({ id: 'p1' })];
    const demandas = [
      demanda('d1', '2026-10-20T00:00:00Z'),
      demanda('d2', '2026-09-01T00:00:00Z'),
      demanda('dTeste', '2026-10-25T00:00:00Z', 'empresa-teste'),
    ];
    const visiveis = filtrarDemandasVisiveis(demandas, membros);
    expect(visiveis.map(d => d.id)).toEqual(['d1', 'd2']);
    expect(demandasNoPeriodo(visiveis, new Date('2026-10-01T00:00:00Z'))).toBe(1);
  });
});

describe('principaisRegioes', () => {
  it('agrupa por UF, conta por papel e ignora sem estado', () => {
    const r = principaisRegioes([
      membro({ id: '1', state: 'SP' }),
      membro({ id: '2', state: 'SP' }),
      membro({ id: '3', state: 'RJ', role: 'company' }),
      membro({ id: '4', state: null }),
    ]);
    expect(r[0]).toEqual({ state: 'SP', profissionais: 2, empresas: 0 });
    expect(r[1]).toEqual({ state: 'RJ', profissionais: 0, empresas: 1 });
    expect(r).toHaveLength(2);
  });
});
