import { describe, it, expect } from 'vitest';
import {
  montarFeedAtividade,
  principaisRegioes,
  comMaisContratos,
  contarContratosAtivos,
  contratosNoPeriodo,
} from '../adminDados';
import type { AdminMemberRow, AdminDemandRow, AdminContractRow, ReportRow } from '../../../services/database';

const membro = (partial: Partial<AdminMemberRow>): AdminMemberRow => ({
  id: 'm1', role: 'professional', display_name: 'Ana', email: 'a@a.com', phone: null,
  city: null, state: null, created_at: '2026-10-01T10:00:00Z', education: null,
  specialization: null, experience: null, hourly_rate: null, segment: null,
  employee_count: null, responsible_name: null, responsible_email: null,
  responsible_phone: null, ...partial,
});

const demanda = (id: string, created_at: string, title = 'Laudo'): AdminDemandRow => ({
  id, title, company_id: 'e1', service_type: null, city: null, state: null,
  budget: null, deadline: null, status: 'active', created_at,
});

const denuncia = (id: string, created_at: string): ReportRow => ({
  id, reporter_id: 'a', reported_id: 'b', message_id: null, reason: 'spam',
  details: null, status: 'open', created_at,
});

const contrato = (id: string, status: string, created_at = '2026-10-10T10:00:00Z', professional_id = 'p1', company_id = 'e1'): AdminContractRow => ({
  id, company_id, professional_id, status, created_at,
});

describe('montarFeedAtividade', () => {
  it('ordena por data desc, limita e rotula cada tipo', () => {
    const feed = montarFeedAtividade(
      [membro({ id: 'p1', display_name: 'Ana', created_at: '2026-10-02T00:00:00Z' }),
       membro({ id: 'e1', role: 'company', display_name: 'ACME', created_at: '2026-10-05T00:00:00Z' }),
       membro({ id: 'adm', role: 'admin', display_name: 'Root', created_at: '2026-10-06T00:00:00Z' })],
      [demanda('d1', '2026-10-04T00:00:00Z')],
      [denuncia('r1', '2026-10-03T00:00:00Z')],
      [contrato('c1', 'accepted', '2026-10-01T00:00:00Z')],
    );
    expect(feed.map(f => f.id)).toEqual(['cadastro-e1', 'demanda-d1', 'denuncia-r1', 'cadastro-p1', 'contrato-c1']);
    expect(feed[0].descricao).toBe('Nova empresa cadastrada: ACME');
    expect(feed.find(f => f.id === 'cadastro-adm')).toBeUndefined();
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

describe('contratos', () => {
  it('conta ativos (accepted+in_progress) e novos no periodo', () => {
    const cs = [contrato('1', 'accepted'), contrato('2', 'in_progress'), contrato('3', 'completed'), contrato('4', 'pending', '2026-09-01T00:00:00Z')];
    expect(contarContratosAtivos(cs)).toBe(2);
    expect(contratosNoPeriodo(cs, new Date('2026-10-01T00:00:00Z'))).toBe(3);
  });
});

describe('comMaisContratos', () => {
  it('rankeia por papel, exclui membros de teste (fora da lista) e quem nao tem contrato', () => {
    const membros = [
      membro({ id: 'p1', display_name: 'Ana', specialization: 'Eng. Seg.', city: 'São Paulo', state: 'SP' }),
      membro({ id: 'p2', display_name: 'Beto' }),
      membro({ id: 'e1', role: 'company', display_name: 'ACME', segment: 'Indústria' }),
    ];
    const cs = [
      contrato('1', 'accepted', undefined, 'p1', 'e1'),
      contrato('2', 'completed', undefined, 'p1', 'e1'),
      contrato('3', 'accepted', undefined, 'pX', 'e1'), // pX nao esta na lista (ex.: teste removido)
    ];
    const profs = comMaisContratos(membros, cs, 'professional');
    expect(profs).toHaveLength(1);
    expect(profs[0]).toMatchObject({ nome: 'Ana', contratos: 2, detalhe: 'Eng. Seg.', local: 'São Paulo, SP' });
    const emps = comMaisContratos(membros, cs, 'company');
    expect(emps[0]).toMatchObject({ nome: 'ACME', contratos: 3 });
    expect(comMaisContratos(membros, [], 'professional')).toEqual([]);
  });
});
