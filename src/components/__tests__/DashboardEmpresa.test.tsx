import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DashboardEmpresa from '../../pages/company/DashboardEmpresa';

const fetchDemandsMock = vi.fn();
const useAuthMock = vi.fn();
const useMessagingDisponivelMock = vi.fn();

vi.mock('../../services/database', () => ({
  fetchDemands: (...args: unknown[]) => fetchDemandsMock(...args),
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
