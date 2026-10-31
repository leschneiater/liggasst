import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DashboardAdmin from '../../pages/admin/DashboardAdmin';
import { montarCsvAdmin, periodoDesde } from '../../pages/admin/exportarAdmin';

const fetchReportsMock = vi.fn();
const fetchProfileNamesMock = vi.fn();
const fetchAdminOverviewMock = vi.fn();
const fetchAdminMembersMock = vi.fn();
const fetchAdminDemandsMock = vi.fn();
const fetchAdminContractsMock = vi.fn();
const fetchTrainingsAdminMock = vi.fn();

vi.mock('../../services/database', () => ({
  fetchReports: (...args: unknown[]) => fetchReportsMock(...args),
  fetchProfileNames: (...args: unknown[]) => fetchProfileNamesMock(...args),
  fetchAdminOverview: (...args: unknown[]) => fetchAdminOverviewMock(...args),
  fetchAdminMembers: (...args: unknown[]) => fetchAdminMembersMock(...args),
  fetchAdminDemands: (...args: unknown[]) => fetchAdminDemandsMock(...args),
  fetchAdminContracts: (...args: unknown[]) => fetchAdminContractsMock(...args),
  fetchTrainingsAdmin: (...args: unknown[]) => fetchTrainingsAdminMock(...args),
}));

const denuncia = (id: string, status: string, created_at: string) => ({
  id,
  reporter_id: 'rep-1',
  reported_id: 'rep-2',
  message_id: null,
  reason: 'spam',
  details: 'Detalhe da denúncia',
  status,
  created_at,
});

const visaoReal = {
  totalProfissionais: 4,
  totalEmpresas: 2,
  novosProfissionaisPeriodo: 1,
  novasEmpresasPeriodo: 1,
  demandasPeriodo: 3,
  denunciasAbertas: 2,
  denunciasPeriodo: 1,
};

const membroProfissional = {
  id: 'p1', role: 'professional', display_name: 'Ana Lima', email: 'ana@exemplo.com',
  phone: '11999990000', city: 'Campinas', state: 'SP', created_at: '2026-10-20T10:00:00Z',
  education: 'Técnico em Segurança', specialization: 'PGR', experience: '5 anos', hourly_rate: 90,
  segment: null, employee_count: null, responsible_name: null, responsible_email: null, responsible_phone: null,
};

const membroEmpresa = {
  id: 'e1', role: 'company', display_name: 'TechCorp', email: 'contato@techcorp.com',
  phone: '1133330000', city: 'São Paulo', state: 'SP', created_at: '2026-10-15T10:00:00Z',
  education: null, specialization: null, experience: null, hourly_rate: null,
  segment: 'Tecnologia', employee_count: '51-100', responsible_name: 'Carlos Dias',
  responsible_email: 'carlos@techcorp.com', responsible_phone: '11988880000',
};

const demandaReal = {
  id: 'd1', title: 'Elaboração de PGR', company_id: 'e1', service_type: 'PGR',
  city: 'São Paulo', state: 'SP', budget: 4500, deadline: '2026-11-30',
  status: 'active', created_at: '2026-10-25T10:00:00Z',
};

const entradaCsv = {
  visao: visaoReal,
  membros: [membroProfissional, membroEmpresa],
  demandas: [demandaReal],
  denuncias: [denuncia('1', 'open', '2026-10-29T10:00:00Z')],
  nomes: { e1: 'TechCorp', 'rep-1': 'Ana', 'rep-2': 'Bruno' },
  desde: periodoDesde('30d', new Date('2026-10-30T12:00:00Z')),
  timeFilter: '30d',
  geradoEm: new Date('2026-10-30T12:00:00Z'),
};

describe('DashboardAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchReportsMock.mockResolvedValue({ success: true, data: [] });
    fetchProfileNamesMock.mockResolvedValue({ success: true, data: {} });
    fetchAdminOverviewMock.mockResolvedValue({ success: true, data: visaoReal });
    fetchAdminMembersMock.mockResolvedValue({ success: true, data: [] });
    fetchAdminDemandsMock.mockResolvedValue({ success: true, data: [] });
    fetchAdminContractsMock.mockResolvedValue({ success: true, data: [] });
    fetchTrainingsAdminMock.mockResolvedValue({ success: true, data: [] });
  });

  it('mostra o numero real de denuncias abertas no cartao', async () => {
    render(<MemoryRouter><DashboardAdmin /></MemoryRouter>);
    await waitFor(() => {
      const titulo = screen.getByText('Denúncias Pendentes');
      const cartao = titulo.closest('div.bg-white')!;
      expect(cartao.textContent).toContain(String(visaoReal.denunciasAbertas));
      expect(cartao.textContent).toContain(`${visaoReal.denunciasPeriodo} no período`);
    });
  });

  it('nao exibe nenhum numero inventado (receita, transacoes, satisfacao)', async () => {
    render(<MemoryRouter><DashboardAdmin /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Denúncias Pendentes')).toBeInTheDocument());
    expect(screen.queryByText(/Receita/i)).toBeNull();
    expect(screen.queryByText(/Transa/i)).toBeNull();
    expect(screen.queryByText(/Satisfa/i)).toBeNull();
    expect(screen.queryByText(/Usuários Ativos/i)).toBeNull();
    expect(screen.queryByText('5247'.replace(/\d/,''))).toBeNull();
  });

  it('alimenta atividade e rankings com dados reais', async () => {
    fetchAdminMembersMock.mockResolvedValue({ success: true, data: [membroProfissional, membroEmpresa] });
    fetchAdminDemandsMock.mockResolvedValue({ success: true, data: [demandaReal] });
    fetchAdminContractsMock.mockResolvedValue({
      success: true,
      data: [{ id: 'c1', company_id: 'e1', professional_id: 'p1', status: 'accepted', created_at: '2026-10-26T10:00:00Z' }],
    });
    fetchTrainingsAdminMock.mockResolvedValue({ success: true, data: [{ id: 't1', status: 'published', is_test: false }] });
    render(<MemoryRouter><DashboardAdmin /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Novo profissional cadastrado: Ana Lima')).toBeInTheDocument());
    expect(screen.getByText('Nova demanda publicada: Elaboração de PGR')).toBeInTheDocument();
    expect(screen.getByText('Profissionais com Mais Contratos')).toBeInTheDocument();
    expect(screen.getByText('Empresas com Mais Contratos')).toBeInTheDocument();
    expect(screen.getAllByText('1 contrato').length).toBe(2);
    // regiao real: SP com 1 profissional e 1 empresa
    expect(screen.getByText('SP')).toBeInTheDocument();
    // treinamento publicado real no cartao
    expect(screen.getAllByText('Treinamentos').length).toBeGreaterThanOrEqual(2);
  });

  it('acao rapida Denuncias navega para /admin/denuncias', async () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin" element={<DashboardAdmin />} />
          <Route path="/admin/denuncias" element={<div>PAGINA DENUNCIAS</div>} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('Exportar')).toBeInTheDocument());
    const botoes = screen.getAllByText('Denúncias');
    const acaoRapida = botoes[botoes.length - 1].closest('button')!;
    fireEvent.click(acaoRapida);
    await waitFor(() => expect(screen.getByText('PAGINA DENUNCIAS')).toBeInTheDocument());
  });

  it('Exportar gera relatorio completo com dados reais', async () => {
    fetchReportsMock.mockResolvedValue({ success: true, data: [denuncia('1', 'open', '2026-10-29T10:00:00Z')] });
    fetchAdminMembersMock.mockResolvedValue({ success: true, data: [membroProfissional, membroEmpresa] });
    fetchAdminDemandsMock.mockResolvedValue({ success: true, data: [demandaReal] });
    fetchProfileNamesMock.mockResolvedValue({ success: true, data: { e1: 'TechCorp', 'rep-1': 'Ana', 'rep-2': 'Bruno' } });
    const createObjectURL = vi.fn(() => 'blob:fake');
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, writable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), writable: true });
    const clicks: string[] = [];
    const clickOriginal = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () { clicks.push((this as HTMLAnchorElement).download); };

    render(<MemoryRouter><DashboardAdmin /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Exportar')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Exportar'));

    await waitFor(() => expect(clicks.length).toBe(1));
    expect(clicks[0]).toMatch(/^liggasst-relatorio-30d-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(fetchAdminOverviewMock).toHaveBeenCalled();
    expect(fetchAdminMembersMock).toHaveBeenCalled();
    expect(fetchAdminDemandsMock).toHaveBeenCalled();
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    const texto = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = reject;
      fr.readAsText(blob);
    });
    expect(texto).toContain('Relatório completo do painel LiggaSST');
    expect(texto).toContain('Profissionais cadastrados (1)');
    expect(texto).toContain('ana@exemplo.com');
    expect(texto).toContain('Empresas cadastradas (1)');
    expect(texto).toContain('carlos@techcorp.com');
    expect(texto).toContain('Demandas publicadas (1)');
    expect(texto).toContain('Elaboração de PGR');
    expect(texto).toContain('Denúncias registradas (1)');
    HTMLAnchorElement.prototype.click = clickOriginal;
  });

  it('Exportar mostra erro quando alguma leitura falha', async () => {
    // o painel carrega com sucesso; so a releitura da exportacao falha
    fetchAdminMembersMock.mockResolvedValueOnce({ success: true, data: [] });
    fetchAdminMembersMock.mockResolvedValue({ success: false, data: [], error: new Error('rls') });
    const createObjectURL = vi.fn(() => 'blob:fake');
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, writable: true });
    render(<MemoryRouter><DashboardAdmin /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Exportar')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Exportar'));
    await waitFor(() => expect(screen.getByText('Exportar')).toBeInTheDocument());
    await new Promise(r => setTimeout(r, 100));
    expect(createObjectURL).not.toHaveBeenCalled();
  });
});

describe('montarCsvAdmin', () => {
  it('inclui resumo, BOM e todas as secoes com listas completas', () => {
    const csv = montarCsvAdmin({
      ...entradaCsv,
      denuncias: [
        denuncia('nova', 'open', '2026-10-29T10:00:00Z'),
        denuncia('antiga', 'actioned', '2026-01-01T10:00:00Z'),
      ],
      desde: periodoDesde('7d', new Date('2026-10-30T12:00:00Z')),
      timeFilter: '7d',
    });
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    expect(csv).toContain('Últimos 7 dias');
    expect(csv).toContain('Completas na data de geração');
    expect(csv).toContain('"Denúncias abertas (total)";"2"');
    // listas completas: a denuncia antiga (fora do periodo) tambem aparece
    expect(csv).toContain('Denúncias registradas (2)');
    expect(csv).toContain('01/01/2026');
    expect(csv).toContain('"4500"');
    expect(csv).toContain('30/11/2026');
    // conta admin nao entra nas listas de membros
    const csvComAdmin = montarCsvAdmin({
      ...entradaCsv,
      membros: [...entradaCsv.membros, { ...membroProfissional, id: 'a1', role: 'admin', display_name: 'Admin' }],
    });
    expect(csvComAdmin).toContain('Profissionais cadastrados (1)');
    expect(csvComAdmin).not.toContain('"Admin"');
  });

  it('neutraliza formula injection em campos de membros, demandas e denuncias', () => {
    const d = denuncia('inj', 'open', '2026-10-29T10:00:00Z');
    d.details = '=HYPERLINK("https://malicioso","clique")';
    const csv = montarCsvAdmin({
      ...entradaCsv,
      membros: [{ ...membroEmpresa, display_name: '  +Empresa', responsible_name: '@cmd', email: '-a@b.com' }],
      demandas: [{ ...demandaReal, title: '=1+1' }],
      denuncias: [d],
      nomes: { 'rep-1': '=cmd', 'rep-2': 'Bruno', e1: 'TechCorp' },
    });
    const campos = csv.split('\r\n').flatMap(l => l.split(';'));
    for (const c of campos) {
      const inner = c.replace(/^"+|"+$/g, '');
      expect(inner.replace(/^[\s\t]+/, '')).not.toMatch(/^[=+\-@]/);
    }
    expect(csv).toContain("'=HYPERLINK");
  });

  it('escapa aspas e quebras de linha nos detalhes', () => {
    const d = denuncia('x', 'open', '2026-10-29T10:00:00Z');
    d.details = 'Ele disse "golpe"\nem duas linhas';
    const csv = montarCsvAdmin({ ...entradaCsv, denuncias: [d] });
    expect(csv).toContain('"Ele disse ""golpe""\nem duas linhas"');
  });
});
