// Gera HTML estatico dos componentes reais com dados de exemplo para
// evidencia visual (renderizado para screenshots fora do vitest).
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, vi } from 'vitest';
import { writeFileSync, readFileSync, readdirSync, mkdirSync } from 'fs';
import path from 'path';
import TreinamentosAdmin from '../../pages/admin/TreinamentosAdmin';
import CertificadosProfissional from '../../pages/professional/CertificadosProfissional';
import BuscaEmpresas from '../../pages/professional/BuscaEmpresas';
import PubliqueDemanda from '../../pages/PubliqueDemanda';
import ComparadorPropostas from '../../pages/company/ComparadorPropostas';
import DemandasDisponiveis from '../../pages/professional/DemandasDisponiveis';
import Treinamentos from '../../pages/Treinamentos';
import Layout from '../Layout/Layout';

Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});

const agora = '2026-10-30T20:00:00Z';
const linha = (id: string, titulo: string, audience: string, status: string, extra: Record<string, unknown> = {}) => ({
  id, title: titulo, description: 'Conteúdo de capacitação em SST com foco em prevenção.',
  audience, youtube_url: null, pdf_path: null, link_url: null, status,
  created_by: 'admin', created_at: agora, updated_at: agora, ...extra,
});
const fixtures = [
  linha('1', 'NR-35 - Trabalho em altura', 'both', 'published', {
    youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    pdf_path: '11111111-1111-1111-1111-111111111111.pdf',
    link_url: 'https://www.gov.br/trabalho-e-emprego/pt-br',
  }),
  linha('2', 'Primeiros socorros na empresa', 'company', 'published', {
    link_url: 'https://exemplo.com/apostila',
  }),
  linha('3', 'Uso correto de EPIs', 'professional', 'draft', {
    pdf_path: '22222222-2222-2222-2222-222222222222.pdf',
  }),
];

const fetchTrainingsAdminMock = vi.fn().mockResolvedValue({ success: true, data: fixtures });
const fetchTrainingsMembroMock = vi.fn().mockResolvedValue({ success: true, data: fixtures });
vi.mock('../../services/database', () => ({
  fetchTrainingsAdmin: (...a: unknown[]) => fetchTrainingsAdminMock(...a),
  fetchTrainingsMembro: (...a: unknown[]) => fetchTrainingsMembroMock(...a),
  getTrainingPdfUrl: vi.fn().mockResolvedValue({ success: true, signedUrl: 'https://exemplo.com/assinado.pdf' }),
  createTraining: vi.fn(), updateTraining: vi.fn(), deleteTraining: vi.fn(), uploadTrainingPdf: vi.fn(),
  fetchMyCertificates: vi.fn().mockResolvedValue({ success: true, data: [
    { id: 'c1', professional_id: 'u1', name: 'NR-35', issuer: 'SENAI', issued_at: '2026-01-10', expires_at: null, storage_path: 'x.pdf', status: 'approved', visible_to_companies: true, created_at: '2026-01-10T00:00:00Z', updated_at: '2026-01-10T00:00:00Z' },
  ] }),
  fetchCompanies: vi.fn().mockResolvedValue({ success: true, data: [
    { id: 'e1', display_name: 'TechCorp Ltda', city: 'São Paulo', state: 'SP', segment: 'Tecnologia', employee_count: '51-100', description: 'Indústria de componentes.', needs: ['PGR'] },
  ] }),
  fetchOwnCompany: vi.fn().mockResolvedValue({ success: true, data: { razao_social: 'Empresa Teste', responsible_name: 'Fulana', responsible_phone: '11999990000' } }),
  publishDemand: vi.fn(), updateCompany: vi.fn(),
  fetchDemands: (...a: unknown[]) => fetchDemandsMock(...a),
  fetchProfileNames: vi.fn().mockResolvedValue({ success: true, data: { 'prof-1': 'Maria Silva', 'prof-2': 'João Costa' } }),
  fetchSharedCertificates: vi.fn().mockResolvedValue({ success: true, data: [{ id: 'c1' }, { id: 'c2' }] }),
  avaliacoesResumo: vi.fn().mockResolvedValue({ media: 4.5, total: 3 }),
}));
// CertificadosProfissional importa o cliente direto; stub minimo (as
// interacoes reais passam pelos servicos ja mockados).
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    storage: { from: () => ({ remove: vi.fn(), upload: vi.fn(), list: vi.fn() }) },
    functions: { invoke: vi.fn() },
  },
}));
vi.mock('../../services/limites', () => ({
  demandasAtivasMinhas: vi.fn().mockResolvedValue(0),
  limiteContatoNovoAtingido: vi.fn().mockResolvedValue(false),
}));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ userType: (window as unknown as { __role?: string }).__role ?? 'professional', currentUser: { id: 'u1', verified: true }, loading: false }),
}));
// Gate pago da Capacitacao: pagante por padrao; o estado de bloqueio do
// membro gratuito tem seu proprio snapshot abaixo.
const demandaFixture = {
  id: 'd1', company_id: 'emp-1', title: 'PGR para fábrica em São Paulo', description: 'Elaboração do PGR completo.',
  service_type: 'PGR', city: 'São Paulo', state: 'SP', budget: 8000, deadline: '2026-12-15',
  status: 'active', created_at: '2026-11-01T10:00:00Z',
};
const fetchDemandsMock = vi.fn().mockResolvedValue({ success: true, data: [demandaFixture] });
const propostasFixture = [
  { id: 'p1', demand_id: 'd1', professional_id: 'prof-1', amount: 4500, deadline_days: 15, message: 'Executo o PGR completo com visita técnica e entrega em 15 dias.', status: 'pending', created_at: '2026-11-02T10:00:00Z' },
  { id: 'p2', demand_id: 'd1', professional_id: 'prof-2', amount: null, deadline_days: 20, message: 'Valor a combinar conforme escopo; incluo treinamento da equipe.', status: 'pending', created_at: '2026-11-02T11:00:00Z' },
];
const fetchPropostasMock = vi.fn().mockResolvedValue({ success: true, data: propostasFixture });
vi.mock('../../services/propostas', () => ({
  fetchPropostasDaDemanda: (...a: unknown[]) => fetchPropostasMock(...a),
  fetchMinhasPropostas: vi.fn().mockResolvedValue({ success: true, data: [] }),
  enviarProposta: vi.fn(),
  atualizarStatusProposta: vi.fn(),
}));

const fetchAssinaturaMock = vi.fn().mockResolvedValue({
  plan: 'pro_professional', status: 'active', current_period_end: null, environment: 'production',
});
vi.mock('../../services/assinatura', () => ({
  fetchAssinatura: (...a: unknown[]) => fetchAssinaturaMock(...a),
}));
vi.mock('../../hooks/useMessagingDisponivel', () => ({ useMessagingDisponivel: () => ({ disponivel: true }) }));
vi.mock('../Layout/Header', () => ({ default: () => <div className="h-16 bg-white border-b flex items-center px-6 font-poppins font-bold text-green-deep">LiggaSST</div> }));
vi.mock('../Layout/Footer', () => ({ default: () => <div className="h-12 bg-gray-100" /> }));

const css = readCss();
function readCss() {
  try {
    const dir = path.resolve(__dirname, '../../../dist/assets');
    const file = readdirSync(dir).find((f) => f.endsWith('.css'));
    return file ? readFileSync(path.join(dir, file), 'utf8') : '';
  } catch { return ''; }
}

const salvar = (nome: string, html: string) => {
  const doc = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><style>${css}</style></head><body>${html}</body></html>`;
  writeFileSync(`/tmp/shots/${nome}.html`, doc);
};

describe('snapshots visuais', () => {
  it('gera HTMLs', async () => {
    mkdirSync('/tmp/shots', { recursive: true });

    const admin = render(<MemoryRouter initialEntries={['/admin/treinamentos']}><TreinamentosAdmin /></MemoryRouter>);
    await admin.findByText('NR-35 - Trabalho em altura');
    salvar('admin-treinamentos', admin.container.innerHTML);

    (window as unknown as { __role?: string }).__role = 'professional';
    const membro = render(<MemoryRouter initialEntries={['/treinamentos-profissional']}><Treinamentos /></MemoryRouter>);
    await membro.findByText('NR-35 - Trabalho em altura');
    salvar('membro-treinamentos', membro.container.innerHTML);

    fetchAssinaturaMock.mockResolvedValueOnce({
      plan: 'free', status: 'active', current_period_end: null, environment: 'production',
    });
    const gratuito = render(<MemoryRouter initialEntries={['/treinamentos-profissional']}><Treinamentos /></MemoryRouter>);
    await gratuito.findByText('Conteúdo exclusivo para assinantes');
    salvar('membro-treinamentos-bloqueado', gratuito.container.innerHTML);

    // Avisos dos limites do plano gratuito (assinatura free).
    fetchAssinaturaMock.mockResolvedValue({
      plan: 'free', status: 'active', current_period_end: null, environment: 'production',
    });
    (window as unknown as { __role?: string }).__role = 'professional';
    const certs = render(<MemoryRouter initialEntries={['/certificados']}><CertificadosProfissional /></MemoryRouter>);
    await certs.findByTestId('aviso-limite-certificados');
    salvar('profissional-certificados-aviso-limite', certs.container.innerHTML);
    certs.unmount();

    const buscaEmp = render(<MemoryRouter initialEntries={['/buscar-empresas']}><BuscaEmpresas /></MemoryRouter>);
    await buscaEmp.findByTestId('aviso-limite-contatos');
    salvar('profissional-busca-empresas-aviso-limite', buscaEmp.container.innerHTML);
    buscaEmp.unmount();

    (window as unknown as { __role?: string }).__role = 'company';
    const pub = render(<MemoryRouter initialEntries={['/publique-demanda']}><PubliqueDemanda /></MemoryRouter>);
    await pub.findByTestId('aviso-limite-demandas');
    salvar('empresa-publique-demanda-aviso-limite', pub.container.innerHTML);
    pub.unmount();

    // Comparador de propostas (plano Empresa): pago ve os cartoes lado a
    // lado; free ve contagem + aviso, sem os cartoes.
    (window as unknown as { __role?: string }).__role = 'company';
    fetchAssinaturaMock.mockResolvedValue({
      plan: 'pro_company', status: 'active', current_period_end: null, environment: 'production',
    });
    const { Route, Routes } = await import('react-router-dom');
    const rotas = (el: React.ReactNode) => (
      <MemoryRouter initialEntries={['/demandas/d1/propostas']}>
        <Routes><Route path="/demandas/:id/propostas" element={el} /></Routes>
      </MemoryRouter>
    );
    const compPago = render(rotas(<ComparadorPropostas />));
    await compPago.findByTestId('comparador-propostas');
    await compPago.findByText('Maria Silva');
    salvar('empresa-comparador-propostas-pago', compPago.container.innerHTML);
    compPago.unmount();

    fetchAssinaturaMock.mockResolvedValue({
      plan: 'free', status: 'active', current_period_end: null, environment: 'production',
    });
    const compFree = render(rotas(<ComparadorPropostas />));
    await compFree.findByTestId('aviso-limite-comparador');
    salvar('empresa-comparador-propostas-gratuito', compFree.container.innerHTML);
    compFree.unmount();

    // Formulario de proposta do profissional na lista de demandas.
    (window as unknown as { __role?: string }).__role = 'professional';
    const listaDemandas = render(<MemoryRouter initialEntries={['/demandas-disponiveis']}><DemandasDisponiveis /></MemoryRouter>);
    const botao = await listaDemandas.findByText('Enviar Proposta');
    botao.click();
    await listaDemandas.findByTestId('form-proposta-d1');
    salvar('profissional-form-proposta', listaDemandas.container.innerHTML);
    listaDemandas.unmount();

    const empresa = render(
      <MemoryRouter initialEntries={['/dashboard-empresa']}>
        <Layout><div className="max-w-7xl mx-auto px-4 py-8"><h1 className="font-poppins text-2xl font-bold">Painel da Empresa</h1><p className="text-gray-600">Conteúdo da página...</p></div></Layout>
      </MemoryRouter>
    );
    salvar('empresa-menu-fixo', empresa.container.innerHTML);
  });
});
