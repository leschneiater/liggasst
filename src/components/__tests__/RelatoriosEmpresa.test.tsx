import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RelatoriosEmpresa from '../../pages/company/RelatoriosEmpresa';

const fetchDemandsMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock('../../services/database', () => ({
  fetchDemands: (...args: unknown[]) => fetchDemandsMock(...args),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const hoje = new Date();
const haNDias = (n: number) => new Date(hoje.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

const demandas = [
  { id: 'd1', title: 'PGR matriz', description: null, service_type: 'PGR', city: 'São Paulo', state: 'SP', budget: 1000, deadline: null, status: 'active', created_at: haNDias(5) },
  { id: 'd2', title: 'PCMSO anual', description: null, service_type: 'PCMSO', city: null, state: null, budget: null, deadline: null, status: 'completed', created_at: haNDias(20) },
  { id: 'd3', title: 'Treinamento NR-10', description: null, service_type: 'NR-10', city: null, state: null, budget: null, deadline: null, status: 'cancelled', created_at: haNDias(100) },
];

describe('RelatoriosEmpresa', () => {
  beforeEach(() => {
    fetchDemandsMock.mockReset().mockResolvedValue({ success: true, data: demandas });
    useAuthMock.mockReset().mockReturnValue({
      currentUser: { id: 'empresa-1' },
      userType: 'company',
      userData: {},
      loading: false,
    });
  });

  it('busca apenas as demandas da própria empresa', async () => {
    render(<MemoryRouter><RelatoriosEmpresa /></MemoryRouter>);
    await waitFor(() => expect(fetchDemandsMock).toHaveBeenCalledWith({ company_id: 'empresa-1' }));
  });

  it('mostra totais reais por status e contagens do período', async () => {
    render(<MemoryRouter><RelatoriosEmpresa /></MemoryRouter>);
    await screen.findByText('PGR matriz');
    // Totais: 1 ativa, 1 concluída, 1 cancelada, 3 no total
    const valores = screen.getAllByText(/^\d+$/).map((el) => el.textContent);
    expect(valores).toContain('1');
    expect(valores).toContain('3');
    // Período padrão de 30 dias: a demanda de 100 dias atrás não entra na lista
    expect(screen.queryByText('Treinamento NR-10')).not.toBeInTheDocument();
  });

  it('mostra estado vazio honesto quando não há demandas', async () => {
    fetchDemandsMock.mockResolvedValue({ success: true, data: [] });
    render(<MemoryRouter><RelatoriosEmpresa /></MemoryRouter>);
    expect(await screen.findByText(/nenhuma demanda publicada ainda/i)).toBeInTheDocument();
  });

  it('mostra estado de erro com tentar novamente quando a leitura falha', async () => {
    fetchDemandsMock.mockResolvedValue({ success: false, error: new Error('falha') });
    render(<MemoryRouter><RelatoriosEmpresa /></MemoryRouter>);
    expect(await screen.findByText(/não foi possível carregar o relatório/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
  });
});
