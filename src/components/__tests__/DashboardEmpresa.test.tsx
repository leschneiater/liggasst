import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DashboardEmpresa from '../../pages/company/DashboardEmpresa';

const fetchDemandsMock = vi.fn();
const updateDemandMock = vi.fn();
const useAuthMock = vi.fn();
const useMessagingDisponivelMock = vi.fn();

vi.mock('../../services/database', () => ({
  fetchDemands: (...args: unknown[]) => fetchDemandsMock(...args),
  updateDemand: (...args: unknown[]) => updateDemandMock(...args),
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
