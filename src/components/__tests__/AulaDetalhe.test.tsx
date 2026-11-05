// Pagina da aula (pedido dela 05/11): gate de assinante, video com nocookie,
// PDF via URL assinada e estado de "nao encontrado".
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AulaDetalhe from '../../pages/AulaDetalhe';
import type { TrainingRow } from '../../services/database';

const fetchTrainingMembroMock = vi.fn();
const getTrainingPdfUrlMock = vi.fn();
vi.mock('../../services/database', () => ({
  fetchTrainingMembro: (...args: unknown[]) => fetchTrainingMembroMock(...args),
  getTrainingPdfUrl: (...args: unknown[]) => getTrainingPdfUrlMock(...args),
}));

const fetchAssinaturaMock = vi.fn();
vi.mock('../../services/assinatura', () => ({
  fetchAssinatura: (...args: unknown[]) => fetchAssinaturaMock(...args),
}));

let roleAtual: 'professional' | 'company' = 'professional';
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ userType: roleAtual, currentUser: { id: 'u1', verified: true }, loading: false }),
}));

const treinamento = (id: string, extra: Partial<TrainingRow> = {}): TrainingRow => ({
  id,
  title: `Treinamento ${id}`,
  description: 'Descrição completa da aula',
  audience: 'both',
  youtube_url: null,
  pdf_path: null,
  link_url: null,
  is_test: false,
  status: 'published',
  created_by: 'admin-1',
  created_at: '2026-10-30T00:00:00Z',
  updated_at: '2026-10-30T00:00:00Z',
  ...extra,
});

const renderPagina = () =>
  render(
    <MemoryRouter initialEntries={['/treinamentos-profissional/aula/1']}>
      <Routes>
        <Route path="/treinamentos-profissional/aula/:id" element={<AulaDetalhe />} />
      </Routes>
    </MemoryRouter>
  );

describe('Pagina da aula', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    roleAtual = 'professional';
    fetchAssinaturaMock.mockResolvedValue({
      plan: 'pro_professional',
      status: 'active',
      current_period_end: null,
      environment: 'production',
    });
  });

  it('membro GRATUITO ve bloqueio com CTA e nao busca a aula', async () => {
    fetchAssinaturaMock.mockResolvedValue({
      plan: 'free',
      status: 'active',
      current_period_end: null,
      environment: 'production',
    });
    renderPagina();
    await waitFor(() => expect(screen.getByText('Conteúdo exclusivo para assinantes')).toBeInTheDocument());
    expect(fetchTrainingMembroMock).not.toHaveBeenCalled();
  });

  it('incorpora video com youtube-nocookie, sem autoplay e com fallback', async () => {
    fetchTrainingMembroMock.mockResolvedValue({
      success: true,
      data: treinamento('1', { youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }),
    });
    renderPagina();
    await waitFor(() => expect(screen.getByTitle('Treinamento 1')).toBeInTheDocument());
    const iframe = screen.getByTitle('Treinamento 1') as HTMLIFrameElement;
    expect(iframe.src).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(iframe.src).not.toContain('autoplay');
    expect(iframe.getAttribute('referrerpolicy')).toBe('strict-origin-when-cross-origin');
    expect(screen.getByText('Abrir no YouTube')).toBeInTheDocument();
    expect(screen.getByText('Descrição completa da aula')).toBeInTheDocument();
  });

  it('abre PDF via funcao de URL assinada', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    fetchTrainingMembroMock.mockResolvedValue({
      success: true,
      data: treinamento('1', { pdf_path: '1.pdf' }),
    });
    getTrainingPdfUrlMock.mockResolvedValue({ success: true, signedUrl: 'https://assinada.example/1.pdf' });
    renderPagina();
    const botao = await screen.findByText('Abrir material em PDF');
    fireEvent.click(botao);
    await waitFor(() => expect(getTrainingPdfUrlMock).toHaveBeenCalledWith('1'));
    await waitFor(() => expect(openSpy).toHaveBeenCalledWith('https://assinada.example/1.pdf', '_blank', 'noopener,noreferrer'));
    openSpy.mockRestore();
  });

  it('treinamento de outro publico ou inexistente mostra nao encontrado', async () => {
    fetchTrainingMembroMock.mockResolvedValue({
      success: true,
      data: treinamento('1', { audience: 'company' }),
    });
    renderPagina();
    await waitFor(() => expect(screen.getByText('Treinamento não encontrado.')).toBeInTheDocument());
  });
});
