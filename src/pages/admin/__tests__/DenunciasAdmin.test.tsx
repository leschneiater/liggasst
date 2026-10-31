import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DenunciasAdmin from '../DenunciasAdmin';

const fetchReportsMock = vi.fn();
const updateReportStatusMock = vi.fn();
const fetchProfileNamesMock = vi.fn();
const fetchRatingReportsAdminMock = vi.fn();
const revisarDenunciaAvaliacaoMock = vi.fn();

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../../../services/database', () => ({
  fetchReports: (...args: unknown[]) => fetchReportsMock(...args),
  updateReportStatus: (...args: unknown[]) => updateReportStatusMock(...args),
  fetchProfileNames: (...args: unknown[]) => fetchProfileNamesMock(...args),
  fetchRatingReportsAdmin: (...args: unknown[]) => fetchRatingReportsAdminMock(...args),
  revisarDenunciaAvaliacao: (...args: unknown[]) => revisarDenunciaAvaliacaoMock(...args),
}));

const denunciaAvaliacao = {
  report_id: 'ra-1',
  rating_id: 'r-1',
  reason: 'conteudo-improprio',
  details: 'Detalhe da denúncia',
  status: 'open',
  created_at: '2026-10-31T10:00:00Z',
  reporter_nome: 'Ana',
  autor_nome: 'Bruno',
  avaliado_nome: 'Carla',
  score: 4,
  comment: 'Comentário denunciado',
  comment_removed_at: null,
  denuncias_abertas: 1,
};

const renderizar = () =>
  render(
    <MemoryRouter>
      <DenunciasAdmin />
    </MemoryRouter>
  );

const abrirComDenuncia = async () => {
  renderizar();
  await screen.findByText('Excluir comentário');
};

describe('DenunciasAdmin - confirmação antes de excluir comentário', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchReportsMock.mockResolvedValue({ success: true, data: [] });
    fetchProfileNamesMock.mockResolvedValue({ success: true, data: {} });
    fetchRatingReportsAdminMock.mockResolvedValue({ success: true, data: [denunciaAvaliacao] });
    revisarDenunciaAvaliacaoMock.mockResolvedValue({ success: true });
  });

  it('abre a confirmação sem executar a exclusão e fecha ao cancelar', async () => {
    await abrirComDenuncia();

    fireEvent.click(screen.getByText('Excluir comentário'));
    expect(screen.getByText(/Excluir este comentário da exibição pública\?/)).toBeInTheDocument();
    expect(revisarDenunciaAvaliacaoMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Cancelar'));
    expect(screen.queryByText(/Excluir este comentário da exibição pública\?/)).not.toBeInTheDocument();
    expect(revisarDenunciaAvaliacaoMock).not.toHaveBeenCalled();
  });

  it('executa a exclusão somente ao confirmar', async () => {
    await abrirComDenuncia();

    fireEvent.click(screen.getByText('Excluir comentário'));
    fireEvent.click(screen.getByText('Confirmar exclusão'));

    await waitFor(() =>
      expect(revisarDenunciaAvaliacaoMock).toHaveBeenCalledWith('ra-1', 'excluir-comentario')
    );
  });

  it('manter comentário continua sem confirmação', async () => {
    await abrirComDenuncia();

    fireEvent.click(screen.getByText('Manter comentário'));

    await waitFor(() =>
      expect(revisarDenunciaAvaliacaoMock).toHaveBeenCalledWith('ra-1', 'manter')
    );
    expect(screen.queryByText(/Excluir este comentário da exibição pública\?/)).not.toBeInTheDocument();
  });
});
