import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DashboardEmpresa from '../../pages/company/DashboardEmpresa';

const fetchDemandsMock = vi.fn();
const updateDemandMock = vi.fn();
const deleteRascunhoMock = vi.fn();
const useAuthMock = vi.fn();
const useMessagingDisponivelMock = vi.fn();

vi.mock('../../services/database', () => ({
  fetchDemands: (...args: unknown[]) => fetchDemandsMock(...args),
  updateDemand: (...args: unknown[]) => updateDemandMock(...args),
  deleteDemandRascunho: (...args: unknown[]) => deleteRascunhoMock(...args),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../../hooks/useMessagingDisponivel', () => ({
  useMessagingDisponivel: () => useMessagingDisponivelMock(),
}));

describe('DashboardEmpresa', () => {
  beforeEach(() => {
    fetchDemandsMock.mockReset().mockResolvedValue({ success: true, data: [] });
    updateDemandMock.mockReset().mockResolvedValue({ success: true, data: {} });
    deleteRascunhoMock.mockReset().mockResolvedValue({ success: true });
    useAuthMock.mockReset().mockReturnValue({
      currentUser: { id: 'empresa-1' },
      userType: 'company',
      userData: { nomeEmpresa: 'Construtora Teste' },
      loading: false,
    });
    useMessagingDisponivelMock.mockReset().mockReturnValue(false);
  });

  it('leva da acao rapida para a busca de profissionais da area da empresa', async () => {
    render(
      <MemoryRouter>
        <DashboardEmpresa />
      </MemoryRouter>
    );
    const link = await screen.findByRole('link', { name: /buscar profissionais/i });
    expect(link).toHaveAttribute('href', '/busca-profissionais-empresa');
  });

  it('oferece editar/concluir/cancelar apenas em demanda ativa', async () => {
    fetchDemandsMock.mockResolvedValue({
      success: true,
      data: [
        { id: 'd1', title: 'PGR ativa', service_type: 'PGR', city: 'São Paulo', state: 'SP', status: 'active', created_at: '2026-10-25T10:00:00Z' },
        { id: 'd2', title: 'PCMSO concluido', service_type: 'PCMSO', city: null, state: null, status: 'completed', created_at: '2026-09-10T10:00:00Z' },
      ],
    });
    render(
      <MemoryRouter>
        <DashboardEmpresa />
      </MemoryRouter>
    );
    await screen.findByText('PGR ativa');
    const editar = screen.getByRole('link', { name: /^editar$/i });
    expect(editar).toHaveAttribute('href', '/editar-demanda/d1');
    expect(screen.getByRole('button', { name: /^concluir$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^cancelar$/i })).toBeInTheDocument();
    // Apenas um conjunto de ações: a demanda concluída não oferece ações
    expect(screen.getAllByRole('button', { name: /^concluir$/i })).toHaveLength(1);
  });

  it('conclui demanda somente após confirmação e recarrega a lista', async () => {
    fetchDemandsMock.mockResolvedValue({
      success: true,
      data: [
        { id: 'd1', title: 'PGR ativa', service_type: 'PGR', city: null, state: null, status: 'active', created_at: '2026-10-25T10:00:00Z' },
      ],
    });
    render(
      <MemoryRouter>
        <DashboardEmpresa />
      </MemoryRouter>
    );
    fireEvent.click(await screen.findByRole('button', { name: /^concluir$/i }));
    // Antes de confirmar, nada foi alterado
    expect(updateDemandMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /^confirmar$/i }));
    await waitFor(() =>
      expect(updateDemandMock).toHaveBeenCalledWith('d1', { status: 'completed' })
    );
    await waitFor(() => expect(fetchDemandsMock).toHaveBeenCalledTimes(2));
  });

  it('cancela demanda com confirmação explícita', async () => {
    fetchDemandsMock.mockResolvedValue({
      success: true,
      data: [
        { id: 'd1', title: 'PGR ativa', service_type: 'PGR', city: null, state: null, status: 'active', created_at: '2026-10-25T10:00:00Z' },
      ],
    });
    render(
      <MemoryRouter>
        <DashboardEmpresa />
      </MemoryRouter>
    );
    fireEvent.click(await screen.findByRole('button', { name: /^cancelar$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^confirmar$/i }));
    await waitFor(() =>
      expect(updateDemandMock).toHaveBeenCalledWith('d1', { status: 'cancelled' })
    );
  });

  const rascunho = {
    id: 'r1', title: 'Rascunho PGR', service_type: null, city: null, state: null,
    status: 'draft', created_at: '2026-10-25T10:00:00Z',
  };

  it('rascunho oferece editar/publicar/descartar e nao concluir/cancelar', async () => {
    fetchDemandsMock.mockResolvedValue({ success: true, data: [rascunho] });
    render(<MemoryRouter><DashboardEmpresa /></MemoryRouter>);
    await screen.findByText('Rascunho PGR');
    expect(screen.getByText('Rascunho')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^editar$/i })).toHaveAttribute('href', '/editar-demanda/r1');
    expect(screen.getByRole('button', { name: /^publicar$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^descartar$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^concluir$/i })).not.toBeInTheDocument();
  });

  it('descarta rascunho somente apos confirmacao', async () => {
    fetchDemandsMock.mockResolvedValue({ success: true, data: [rascunho] });
    render(<MemoryRouter><DashboardEmpresa /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /^descartar$/i }));
    expect(deleteRascunhoMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /^confirmar$/i }));
    await waitFor(() => expect(deleteRascunhoMock).toHaveBeenCalledWith('r1'));
    expect(updateDemandMock).not.toHaveBeenCalled();
    await waitFor(() => expect(fetchDemandsMock).toHaveBeenCalledTimes(2));
  });

  it('rascunho incompleto nao publica pelo painel', async () => {
    fetchDemandsMock.mockResolvedValue({ success: true, data: [{ ...rascunho, description: 'x' }] });
    render(<MemoryRouter><DashboardEmpresa /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /^publicar$/i }));
    expect(screen.queryByRole('button', { name: /^confirmar$/i })).not.toBeInTheDocument();
    expect(updateDemandMock).not.toHaveBeenCalled();
  });

  it('rascunho completo publica (draft -> active) apos confirmacao', async () => {
    fetchDemandsMock.mockResolvedValue({ success: true, data: [{
      ...rascunho, description: 'd', service_type: 'PGR', city: 'SP', state: 'SP',
      deadline: '2026-12-01', modalidade: 'remoto', urgencia: 'baixa', tipo_orcamento: 'fixo',
    }] });
    render(<MemoryRouter><DashboardEmpresa /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /^publicar$/i }));
    expect(updateDemandMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /^confirmar$/i }));
    await waitFor(() => expect(updateDemandMock).toHaveBeenCalledWith('r1', { status: 'active' }));
  });

  it('nao oferece atalho para a rota inexistente de downloads', async () => {
    render(
      <MemoryRouter>
        <DashboardEmpresa />
      </MemoryRouter>
    );
    await waitFor(() => expect(fetchDemandsMock).toHaveBeenCalled());
    expect(screen.queryByRole('link', { name: /downloads/i })).not.toBeInTheDocument();
  });
});
