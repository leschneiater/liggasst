// Gera HTML estatico das telas da Etapa 2 (trilhas) para preview visual.
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, vi } from 'vitest';
import { writeFileSync, readFileSync, readdirSync, mkdirSync } from 'fs';
import path from 'path';
import Treinamentos from '../../pages/Treinamentos';
import TrilhaDetalhe from '../../pages/TrilhaDetalhe';
import TreinamentosAdmin from '../../pages/admin/TreinamentosAdmin';

vi.mock('../../services/assinatura', () => ({
  fetchAssinatura: vi.fn().mockResolvedValue({ plan: 'pro_professional', status: 'active', current_period_end: null, environment: 'production' }),
}));
vi.mock('../../services/database', () => ({
  fetchTrainingsMembro: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getTrainingPdfUrl: vi.fn(),
  fetchTrainingsAdmin: vi.fn().mockResolvedValue({ success: true, data: [] }),
  createTraining: vi.fn(),
  updateTraining: vi.fn(),
  deleteTraining: vi.fn(),
  uploadTrainingPdf: vi.fn(),
}));

vi.mock('../../services/trilhas', () => {
  const trilha = {
    id: 'tr1',
    titulo: 'Primeiros passos em SST',
    descricao: 'Conceitos básicos de segurança do trabalho para quem está começando na área.',
    audience: 'professional',
    kind: 'open',
    published: true,
    is_test: false,
    ordem: 0,
  };
  return {
  fetchTrilhasMembro: vi.fn().mockResolvedValue({
    success: true,
    data: [{ ...trilha, totalSecoes: 5, secoesConcluidas: 2 }],
  }),
  fetchTrilhaDetalhe: vi.fn().mockResolvedValue({
    success: true,
    data: {
      trilha,
      secoes: [
        { id: 's1', trail_id: 'tr1', ordem: 1, titulo: 'Boas-vindas e visão geral', content_type: 'link', conteudo: 'https://exemplo.com/material' },
        { id: 's2', trail_id: 'tr1', ordem: 2, titulo: 'Apostila de conceitos', content_type: 'pdf', conteudo: '22222222-2222-2222-2222-222222222222.pdf' },
      ],
      concluidas: new Set(['s1']),
    },
  }),
  concluirSecao: vi.fn(),
  getSecaoTrilhaPdfUrl: vi.fn(),
  fetchMeusSelos: vi.fn().mockResolvedValue({ success: true, data: [] }),
  fetchTrilhasAdmin: vi.fn().mockResolvedValue({
    success: true,
    data: [{ ...trilha, totalSecoes: 5 }],
  }),
  fetchSecoesAdmin: vi.fn().mockResolvedValue({ success: true, data: [] }),
  createTrilha: vi.fn(),
  updateTrilha: vi.fn(),
  deleteTrilha: vi.fn(),
  createSecao: vi.fn(),
  deleteSecao: vi.fn(),
  uploadSecaoPdf: vi.fn(),
  };
});
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ userType: 'professional', currentUser: { id: 'u1', verified: true }, loading: false }),
}));
vi.mock('../../hooks/useMessagingDisponivel', () => ({ useMessagingDisponivel: () => ({ disponivel: false }) }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../../components/Layout/AdminAreaNav', () => ({ default: () => null }));

const css = (() => {
  try {
    const dir = path.join(process.cwd(), 'dist', 'assets');
    const arquivo = readdirSync(dir).find((f) => f.endsWith('.css'));
    return arquivo ? readFileSync(path.join(dir, arquivo), 'utf8') : '';
  } catch { return ''; }
})();
const salvar = (nome: string, html: string) => {
  const doc = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><style>${css}</style></head><body>${html}</body></html>`;
  writeFileSync(`/tmp/shots/${nome}.html`, doc);
};

describe('preview visual da Etapa 2 (trilhas)', () => {
  it('lista de trilhas do membro com progresso', async () => {
    mkdirSync('/tmp/shots', { recursive: true });
    const tela = render(<MemoryRouter><Treinamentos /></MemoryRouter>);
    await tela.findByText('Primeiros passos em SST');
    salvar('membro-trilhas-lista', tela.container.innerHTML);
  });

  it('pagina da trilha com secoes e gating de conclusao', async () => {
    const tela = render(
      <MemoryRouter initialEntries={['/treinamentos-profissional/trilha/tr1']}>
        <Routes>
          <Route path="/treinamentos-profissional/trilha/:id" element={<TrilhaDetalhe />} />
        </Routes>
      </MemoryRouter>,
    );
    await tela.findByText(/Apostila de conceitos/);
    salvar('membro-trilha-detalhe', tela.container.innerHTML);
  });

  it('admin: CRUD de trilhas', async () => {
    const tela = render(<MemoryRouter><TreinamentosAdmin /></MemoryRouter>);
    await tela.findByText('Primeiros passos em SST');
    salvar('admin-trilhas', tela.container.innerHTML);
  });
});
