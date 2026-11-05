// Teste de componente da pagina da trilha (Etapa 2): paywall, gating do
// botao "Concluir secao" (so depois de abrir o conteudo) e concessao de selo.
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TrilhaDetalhe from '../../pages/TrilhaDetalhe';

const fetchTrilhaDetalheMock = vi.fn();
const concluirSecaoMock = vi.fn();
const getSecaoTrilhaPdfUrlMock = vi.fn();
const fetchTentativaRecenteMock = vi.fn();
vi.mock('../../services/trilhas', () => ({
  fetchTrilhaDetalhe: (...args: unknown[]) => fetchTrilhaDetalheMock(...args),
  concluirSecao: (...args: unknown[]) => concluirSecaoMock(...args),
  getSecaoTrilhaPdfUrl: (...args: unknown[]) => getSecaoTrilhaPdfUrlMock(...args),
  fetchTentativaRecente: (...args: unknown[]) => fetchTentativaRecenteMock(...args),
}));

// A prova em si e testada em ProvaTrilha.test.tsx; aqui ela vira um stub.
vi.mock('../../components/ProvaTrilha', () => ({
  default: () => <div>PROVA ABERTA</div>,
}));

const fetchAssinaturaMock = vi.fn();
vi.mock('../../services/assinatura', () => ({
  fetchAssinatura: (...args: unknown[]) => fetchAssinaturaMock(...args),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ userType: 'professional', currentUser: { id: 'u1', verified: true }, loading: false }),
}));

const toastSucesso = vi.fn();
const toastErro = vi.fn();
vi.mock('react-hot-toast', () => ({
  default: { success: (...a: unknown[]) => toastSucesso(...a), error: (...a: unknown[]) => toastErro(...a) },
}));

const ASSINATURA_PAGA = {
  plan: 'pro_professional',
  status: 'active',
  current_period_end: null,
  environment: 'production',
};

const trilhaBase = {
  id: 'tr1',
  titulo: 'Primeiros passos em SST',
  descricao: 'Trilha introdutória',
  audience: 'professional',
  kind: 'open',
  published: true,
  ordem: 0,
};

const secoesBase = [
  { id: 's1', trail_id: 'tr1', ordem: 1, titulo: 'Aula 1', content_type: 'link', conteudo: 'https://exemplo.com/material' },
  { id: 's2', trail_id: 'tr1', ordem: 2, titulo: 'Apostila', content_type: 'pdf', conteudo: '22222222-2222-2222-2222-222222222222.pdf' },
];

const renderPagina = () =>
  render(
    <MemoryRouter initialEntries={['/treinamentos-profissional/trilha/tr1']}>
      <Routes>
        <Route path="/treinamentos-profissional/trilha/:id" element={<TrilhaDetalhe />} />
      </Routes>
    </MemoryRouter>,
  );

describe('TrilhaDetalhe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('conta gratuita vê paywall com CTA de planos', async () => {
    fetchAssinaturaMock.mockResolvedValue(null);
    renderPagina();
    expect(await screen.findByText('Conteúdo exclusivo para assinantes')).toBeTruthy();
    expect(screen.getByText('Ver planos')).toBeTruthy();
    expect(fetchTrilhaDetalheMock).not.toHaveBeenCalled();
  });

  it('"Concluir seção" só habilita depois de abrir o conteúdo', async () => {
    fetchAssinaturaMock.mockResolvedValue(ASSINATURA_PAGA);
    fetchTrilhaDetalheMock.mockResolvedValue({
      success: true,
      data: { trilha: trilhaBase, secoes: secoesBase, concluidas: new Set() },
    });
    renderPagina();
    await screen.findByText('Primeiros passos em SST');

    // Antes de abrir: botão orienta a abrir o conteúdo e fica desabilitado.
    const antes = screen.getAllByText('Abra o conteúdo para concluir');
    expect(antes.length).toBe(2);
    expect((antes[0].closest('button') as HTMLButtonElement).disabled).toBe(true);

    // Abre o link da seção 1.
    fireEvent.click(screen.getByText('Acessar material externo'));
    const botao = await screen.findByText('Concluir seção');
    expect((botao.closest('button') as HTMLButtonElement).disabled).toBe(false);

    // Conclui: serviço chamado, seção marcada, toast de conclusão.
    concluirSecaoMock.mockResolvedValue({ success: true, seloNovo: false });
    fireEvent.click(botao);
    await waitFor(() => expect(concluirSecaoMock).toHaveBeenCalledWith('tr1', 's1'));
    expect(await screen.findByText('Concluída')).toBeTruthy();
    expect(toastSucesso).toHaveBeenCalledWith('Seção concluída.');
  });

  it('mostra selo conquistado quando a última seção fecha a trilha', async () => {
    fetchAssinaturaMock.mockResolvedValue(ASSINATURA_PAGA);
    fetchTrilhaDetalheMock.mockResolvedValue({
      success: true,
      data: { trilha: trilhaBase, secoes: secoesBase, concluidas: new Set(['s1']) },
    });
    concluirSecaoMock.mockResolvedValue({ success: true, seloNovo: true });
    getSecaoTrilhaPdfUrlMock.mockResolvedValue({ success: true, signedUrl: 'https://assinada.example/x.pdf' });
    const abrir = vi.spyOn(window, 'open').mockImplementation(() => null);

    renderPagina();
    await screen.findByText('Primeiros passos em SST');
    expect(screen.getByText('1 de 2 seções')).toBeTruthy();

    fireEvent.click(screen.getByText('Abrir material em PDF'));
    const botao = await screen.findByText('Concluir seção');
    fireEvent.click(botao.closest('button') as HTMLButtonElement);
    await waitFor(() => expect(concluirSecaoMock).toHaveBeenCalledWith('tr1', 's2'));
    expect(await screen.findByText('Selo conquistado')).toBeTruthy();
    expect(toastSucesso).toHaveBeenCalledWith('Selo conquistado: Primeiros passos em SST! Ele já aparece no seu perfil.');
    abrir.mockRestore();
  });

  it('falha ao abrir PDF não marca a seção como aberta', async () => {
    fetchAssinaturaMock.mockResolvedValue(ASSINATURA_PAGA);
    fetchTrilhaDetalheMock.mockResolvedValue({
      success: true,
      data: { trilha: trilhaBase, secoes: secoesBase, concluidas: new Set() },
    });
    getSecaoTrilhaPdfUrlMock.mockResolvedValue({ success: false });

    renderPagina();
    await screen.findByText('Primeiros passos em SST');
    fireEvent.click(screen.getByText('Abrir material em PDF'));
    await waitFor(() => expect(toastErro).toHaveBeenCalled());
    // Seção de PDF continua bloqueada para conclusão.
    const bloqueados = screen.getAllByText('Abra o conteúdo para concluir');
    expect(bloqueados.length).toBeGreaterThan(0);
  });
});

describe('TrilhaDetalhe - avaliacao (trilha certified, etapa 3)', () => {
  const trilhaCert = {
    ...trilhaBase,
    kind: 'certified',
    exam_question_count: 10,
    exam_pass_score: 70,
  };

  it('secoes pendentes: avaliacao aparece bloqueada, sem botao', async () => {
    fetchAssinaturaMock.mockResolvedValue(ASSINATURA_PAGA);
    fetchTrilhaDetalheMock.mockResolvedValue({
      success: true,
      data: { trilha: trilhaCert, secoes: secoesBase, concluidas: new Set(['s1']) },
    });
    fetchTentativaRecenteMock.mockResolvedValue({ success: true, data: null });
    renderPagina();
    await screen.findByText('Avaliação final');
    expect(screen.getByText(/Conclua todas as seções para liberar a avaliação/)).toBeTruthy();
    expect(screen.queryByText('Iniciar avaliação')).toBeNull();
  });

  it('trilha concluida e sem tentativa: botao Iniciar avaliacao abre a prova', async () => {
    fetchAssinaturaMock.mockResolvedValue(ASSINATURA_PAGA);
    fetchTrilhaDetalheMock.mockResolvedValue({
      success: true,
      data: { trilha: trilhaCert, secoes: secoesBase, concluidas: new Set(['s1', 's2']) },
    });
    fetchTentativaRecenteMock.mockResolvedValue({ success: true, data: null });
    renderPagina();
    await screen.findByText('Avaliação final');
    fireEvent.click(screen.getByText('Iniciar avaliação'));
    expect(await screen.findByText('PROVA ABERTA')).toBeTruthy();
  });

  it('reprovado recente: mostra a data de liberacao, sem botao', async () => {
    const futuro = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    fetchAssinaturaMock.mockResolvedValue(ASSINATURA_PAGA);
    fetchTrilhaDetalheMock.mockResolvedValue({
      success: true,
      data: { trilha: trilhaCert, secoes: secoesBase, concluidas: new Set(['s1', 's2']) },
    });
    fetchTentativaRecenteMock.mockResolvedValue({
      success: true,
      data: { finished_at: '2026-11-04T20:00:00Z', passed: false, score: 60, locked_until: futuro },
    });
    renderPagina();
    await screen.findByText('Avaliação final');
    expect(await screen.findByText(/Nova tentativa liberada em/)).toBeTruthy();
    expect(screen.queryByText('Iniciar avaliação')).toBeNull();
  });

  it('aprovado: mostra a nota e a mensagem do certificado', async () => {
    fetchAssinaturaMock.mockResolvedValue(ASSINATURA_PAGA);
    fetchTrilhaDetalheMock.mockResolvedValue({
      success: true,
      data: { trilha: trilhaCert, secoes: secoesBase, concluidas: new Set(['s1', 's2']) },
    });
    fetchTentativaRecenteMock.mockResolvedValue({
      success: true,
      data: { finished_at: '2026-11-04T20:00:00Z', passed: true, score: 90, locked_until: null },
    });
    renderPagina();
    await screen.findByText('Avaliação final');
    expect(await screen.findByText(/Você foi aprovado com nota/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ver certificado' })).toBeTruthy();
  });
});
