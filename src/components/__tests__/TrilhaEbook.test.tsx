// Ebook de revisao (Etapa 4): cartao do ebook na pagina da trilha, leitura
// no app, marcar como lida (so depois de abrir o texto) e o lembrete no
// cartao de avaliacao bloqueada. Regra de desbloqueio em si e do servidor
// (coberta em supabase/tests/trilhas_ebook.test.mjs).
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TrilhaDetalhe from '../../pages/TrilhaDetalhe';

const fetchTrilhaDetalheMock = vi.fn();
const concluirSecaoMock = vi.fn();
const getSecaoTrilhaPdfUrlMock = vi.fn();
const fetchTentativaRecenteMock = vi.fn();
const marcarEbookLidaMock = vi.fn();
vi.mock('../../services/trilhas', () => ({
  fetchTrilhaDetalhe: (...args: unknown[]) => fetchTrilhaDetalheMock(...args),
  concluirSecao: (...args: unknown[]) => concluirSecaoMock(...args),
  getSecaoTrilhaPdfUrl: (...args: unknown[]) => getSecaoTrilhaPdfUrlMock(...args),
  fetchTentativaRecente: (...args: unknown[]) => fetchTentativaRecenteMock(...args),
  marcarEbookLida: (...args: unknown[]) => marcarEbookLidaMock(...args),
}));

vi.mock('../../components/ProvaTrilha', () => ({
  default: () => <div>PROVA ABERTA</div>,
}));

const fetchAssinaturaMock = vi.fn();
vi.mock('../../services/assinatura', () => ({
  fetchAssinatura: (...args: unknown[]) => fetchAssinaturaMock(...args),
  fetchDadosFaturamento: vi.fn(async () => null),
  salvarDadosFaturamento: vi.fn(async () => {}),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ userType: 'professional', currentUser: { id: 'u1', verified: true }, loading: false }),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const ASSINATURA_PAGA = {
  plan: 'pro_professional',
  status: 'active',
  current_period_end: null,
  environment: 'production',
};

const trilhaCert = {
  id: 'tr1',
  titulo: 'NR-1: Gerenciamento de riscos',
  descricao: 'Trilha com avaliação.',
  audience: 'professional',
  kind: 'certified',
  published: true,
  ordem: 0,
  exam_question_count: 10,
  exam_pass_score: 70,
};

const secoesComEbook = [
  { id: 's1', trail_id: 'tr1', ordem: 1, titulo: 'Aula 1', content_type: 'link', conteudo: 'https://exemplo.com/material' },
  { id: 'e1', trail_id: 'tr1', ordem: 8, titulo: 'Conceitos essenciais', content_type: 'ebook', conteudo: 'Texto da parte 1 do ebook.\nCom exemplos.' },
  { id: 'e2', trail_id: 'tr1', ordem: 9, titulo: 'Erros comuns', content_type: 'ebook', conteudo: 'Texto da parte 2 do ebook.' },
];

const renderPagina = () =>
  render(
    <MemoryRouter initialEntries={['/treinamentos-profissional/trilha/tr1']}>
      <Routes>
        <Route path="/treinamentos-profissional/trilha/:id" element={<TrilhaDetalhe />} />
      </Routes>
    </MemoryRouter>,
  );

const preparar = (secoes: typeof secoesComEbook, tentativa: unknown = null, lidas: string[] = []) => {
  fetchAssinaturaMock.mockResolvedValue(ASSINATURA_PAGA);
  fetchTrilhaDetalheMock.mockResolvedValue({
    success: true,
    data: { trilha: trilhaCert, secoes, concluidas: new Set(['s1']), ebookLidas: new Set(lidas) },
  });
  fetchTentativaRecenteMock.mockResolvedValue({ success: true, data: tentativa });
};

describe('TrilhaDetalhe - ebook de revisao (Etapa 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('trilha certified com ebook mostra o cartao com o progresso de leitura', async () => {
    preparar(secoesComEbook);
    renderPagina();
    expect(await screen.findByText('Ebook de revisão')).toBeTruthy();
    expect(screen.getByText('0 de 2 partes lidas')).toBeTruthy();
    expect(screen.getByText('1. Conceitos essenciais')).toBeTruthy();
    expect(screen.getByText('2. Erros comuns')).toBeTruthy();
    // secao de conteudo segue na lista principal, sem o ebook misturado
    expect(screen.getByText('1. Aula 1')).toBeTruthy();
    expect(screen.queryByText('3. Conceitos essenciais')).toBeNull();
  });

  it('marcar como lida so habilita depois de abrir o texto, e registra no servidor', async () => {
    preparar(secoesComEbook);
    marcarEbookLidaMock.mockResolvedValue({ success: true, total: 2, lidas: 1 });
    renderPagina();
    await screen.findByText('Ebook de revisão');

    const botaoMarcar = screen.getAllByText('Leia o texto para marcar')[0].closest('button')!;
    expect(botaoMarcar.disabled).toBe(true);

    fireEvent.click(screen.getAllByText('Ler esta parte')[0]);
    expect(screen.getByText(/Texto da parte 1 do ebook/)).toBeTruthy();

    const botaoHabilitado = screen.getByText('Marcar como lida').closest('button')!;
    expect(botaoHabilitado.disabled).toBe(false);
    fireEvent.click(botaoHabilitado);
    await waitFor(() => expect(marcarEbookLidaMock).toHaveBeenCalledWith('e1'));
    expect(await screen.findByText('1 de 2 partes lidas')).toBeTruthy();
  });

  it('avaliacao bloqueada lembra o ebook enquanto a leitura nao esta completa', async () => {
    preparar(secoesComEbook, {
      finished_at: new Date().toISOString(),
      passed: false,
      score: 40,
      locked_until: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
    });
    renderPagina();
    expect(await screen.findByText('Nova tentativa liberada em', { exact: false })).toBeTruthy();
    expect(
      await screen.findByText(/Aproveite para ler o ebook de revisão até o final/),
    ).toBeTruthy();
  });

  it('trilha sem secoes de ebook nao mostra o cartao nem o lembrete', async () => {
    preparar([secoesComEbook[0]], {
      finished_at: new Date().toISOString(),
      passed: false,
      score: 40,
      locked_until: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
    });
    renderPagina();
    expect(await screen.findByText('Avaliação final')).toBeTruthy();
    expect(screen.queryByText('Ebook de revisão')).toBeNull();
    expect(screen.queryByText(/Aproveite para ler o ebook/)).toBeNull();
  });
});
