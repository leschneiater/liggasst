import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Treinamentos from '../../pages/Treinamentos';
import { treinamentoVisivelPara } from '../../utils/treinamentos';
import type { TrainingRow } from '../../services/database';

const fetchTrainingsMembroMock = vi.fn();
const getTrainingPdfUrlMock = vi.fn();

vi.mock('../../services/database', () => ({
  fetchTrainingsMembro: (...args: unknown[]) => fetchTrainingsMembroMock(...args),
  getTrainingPdfUrl: (...args: unknown[]) => getTrainingPdfUrlMock(...args),
}));

let roleAtual: 'professional' | 'company' = 'professional';
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ userType: roleAtual, currentUser: { id: 'u1', verified: true }, loading: false }),
}));

const treinamento = (id: string, audience: TrainingRow['audience'], extra: Partial<TrainingRow> = {}): TrainingRow => ({
  id,
  title: `Treinamento ${id}`,
  description: 'Descrição',
  audience,
  youtube_url: null,
  pdf_path: null,
  status: 'published',
  created_by: 'admin-1',
  created_at: '2026-10-30T00:00:00Z',
  updated_at: '2026-10-30T00:00:00Z',
  ...extra,
});

describe('treinamentoVisivelPara', () => {
  it('publicado para ambos aparece para empresa e profissional', () => {
    const t = { audience: 'both' as const, status: 'published' as const };
    expect(treinamentoVisivelPara(t, 'company')).toBe(true);
    expect(treinamentoVisivelPara(t, 'professional')).toBe(true);
  });
  it('restringe por papel', () => {
    const emp = { audience: 'company' as const, status: 'published' as const };
    expect(treinamentoVisivelPara(emp, 'company')).toBe(true);
    expect(treinamentoVisivelPara(emp, 'professional')).toBe(false);
    const prof = { audience: 'professional' as const, status: 'published' as const };
    expect(treinamentoVisivelPara(prof, 'professional')).toBe(true);
    expect(treinamentoVisivelPara(prof, 'company')).toBe(false);
  });
  it('rascunho nao aparece para membro, mas aparece para admin', () => {
    const rasc = { audience: 'both' as const, status: 'draft' as const };
    expect(treinamentoVisivelPara(rasc, 'professional')).toBe(false);
    expect(treinamentoVisivelPara(rasc, 'company')).toBe(false);
    expect(treinamentoVisivelPara(rasc, 'admin')).toBe(true);
  });
});

describe('Pagina Treinamentos (membro)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    roleAtual = 'professional';
  });

  it('mostra so treinamentos do publico do membro', async () => {
    fetchTrainingsMembroMock.mockResolvedValue({
      success: true,
      data: [
        treinamento('1', 'both'),
        treinamento('2', 'company'),
        treinamento('3', 'professional'),
      ],
    });
    render(<MemoryRouter><Treinamentos /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Treinamento 1')).toBeInTheDocument());
    expect(screen.queryByText('Treinamento 2')).not.toBeInTheDocument();
    expect(screen.getByText('Treinamento 3')).toBeInTheDocument();
  });

  it('incorpora video com youtube-nocookie, sem autoplay e com fallback', async () => {
    fetchTrainingsMembroMock.mockResolvedValue({
      success: true,
      data: [treinamento('1', 'both', { youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })],
    });
    render(<MemoryRouter><Treinamentos /></MemoryRouter>);
    await waitFor(() => expect(screen.getByTitle('Treinamento 1')).toBeInTheDocument());
    const iframe = screen.getByTitle('Treinamento 1') as HTMLIFrameElement;
    expect(iframe.src).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(iframe.src).not.toContain('autoplay');
    expect(iframe.getAttribute('referrerpolicy')).toBe('strict-origin-when-cross-origin');
    expect(screen.getByText('Abrir no YouTube')).toBeInTheDocument();
  });

  it('abre PDF via funcao de URL assinada', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    fetchTrainingsMembroMock.mockResolvedValue({
      success: true,
      data: [treinamento('1', 'both', { pdf_path: '1.pdf' })],
    });
    getTrainingPdfUrlMock.mockResolvedValue({ success: true, signedUrl: 'https://assinada.example/1.pdf' });
    render(<MemoryRouter><Treinamentos /></MemoryRouter>);
    const botao = await screen.findByText('Abrir material em PDF');
    fireEvent.click(botao);
    await waitFor(() => expect(getTrainingPdfUrlMock).toHaveBeenCalledWith('1'));
    await waitFor(() => expect(openSpy).toHaveBeenCalledWith('https://assinada.example/1.pdf', '_blank', 'noopener,noreferrer'));
    openSpy.mockRestore();
  });

  it('mostra estado vazio quando nao ha treinamentos do publico', async () => {
    roleAtual = 'company';
    fetchTrainingsMembroMock.mockResolvedValue({
      success: true,
      data: [treinamento('2', 'professional')],
    });
    render(<MemoryRouter><Treinamentos /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Nenhum treinamento disponível no momento.')).toBeInTheDocument());
  });
});
