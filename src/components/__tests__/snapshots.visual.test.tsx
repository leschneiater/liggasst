// Gera HTML estatico dos componentes reais com dados de exemplo para
// evidencia visual (renderizado para screenshots fora do vitest).
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, vi } from 'vitest';
import { writeFileSync, readFileSync, readdirSync, mkdirSync } from 'fs';
import path from 'path';
import TreinamentosAdmin from '../../pages/admin/TreinamentosAdmin';
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
}));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ userType: (window as unknown as { __role?: string }).__role ?? 'professional', currentUser: { id: 'u1', verified: true }, loading: false }),
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

    const empresa = render(
      <MemoryRouter initialEntries={['/dashboard-empresa']}>
        <Layout><div className="max-w-7xl mx-auto px-4 py-8"><h1 className="font-poppins text-2xl font-bold">Painel da Empresa</h1><p className="text-gray-600">Conteúdo da página...</p></div></Layout>
      </MemoryRouter>
    );
    salvar('empresa-menu-fixo', empresa.container.innerHTML);
  });
});
