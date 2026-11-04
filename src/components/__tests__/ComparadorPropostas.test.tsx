// Comparador: conta free ve contagem + aviso com link /planos e NAO ve os
// cartoes; conta paga ve o comparador lado a lado e decide aceitar/recusar.
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ComparadorPropostas from '../../pages/company/ComparadorPropostas';

const fetchDemandsMock = vi.fn();
const fetchProfileNamesMock = vi.fn();
const fetchSharedCertificatesMock = vi.fn();
const avaliacoesResumoMock = vi.fn();
const fetchPropostasMock = vi.fn();
const atualizarStatusMock = vi.fn();
const planoPagoMock = vi.fn();

vi.mock('../../services/database', () => ({
  fetchDemands: (...a: unknown[]) => fetchDemandsMock(...a),
  fetchProfileNames: (...a: unknown[]) => fetchProfileNamesMock(...a),
  fetchSharedCertificates: (...a: unknown[]) => fetchSharedCertificatesMock(...a),
  avaliacoesResumo: (...a: unknown[]) => avaliacoesResumoMock(...a),
}));
vi.mock('../../services/propostas', () => ({
  fetchPropostasDaDemanda: (...a: unknown[]) => fetchPropostasMock(...a),
  atualizarStatusProposta: (...a: unknown[]) => atualizarStatusMock(...a),
}));
vi.mock('../../hooks/usePlanoPago', () => ({
  usePlanoPago: () => planoPagoMock(),
}));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const demanda = {
  id: 'd1', title: 'PGR para fábrica', description: 'desc', service_type: 'PGR',
  city: 'São Paulo', state: 'SP', budget: null, deadline: null, status: 'active',
  created_at: '2026-11-01T10:00:00Z',
};
const proposta = {
  id: 'p1', demand_id: 'd1', professional_id: 'prof-1', amount: 4500,
  deadline_days: 15, message: 'Executo o PGR completo com visita técnica.',
  status: 'pending', created_at: '2026-11-02T10:00:00Z',
};

const renderizar = () =>
  render(
    <MemoryRouter initialEntries={['/demandas/d1/propostas']}>
      <Routes>
        <Route path="/demandas/:id/propostas" element={<ComparadorPropostas />} />
      </Routes>
    </MemoryRouter>,
  );

describe('ComparadorPropostas', () => {
  beforeEach(() => {
    fetchDemandsMock.mockReset().mockResolvedValue({ success: true, data: [demanda] });
    fetchPropostasMock.mockReset().mockResolvedValue({ success: true, data: [proposta] });
    fetchProfileNamesMock.mockReset().mockResolvedValue({ success: true, data: { 'prof-1': 'Maria SST' } });
    fetchSharedCertificatesMock.mockReset().mockResolvedValue({ success: true, data: [{ id: 'c1' }, { id: 'c2' }] });
    avaliacoesResumoMock.mockReset().mockResolvedValue({ media: 4.5, total: 3 });
    atualizarStatusMock.mockReset().mockResolvedValue({ success: true, data: { ...proposta, status: 'accepted' } });
  });

  it('conta free ve contagem e aviso, sem os cartoes do comparador', async () => {
    planoPagoMock.mockReturnValue(false);
    renderizar();
    await waitFor(() => expect(screen.getByTestId('contagem-propostas')).toBeTruthy());
    expect(screen.getByText(/1 proposta recebida/)).toBeTruthy();
    expect(screen.getByTestId('aviso-limite-comparador')).toBeTruthy();
    expect(screen.getByText(/recurso do plano Empresa/)).toBeTruthy();
    expect(screen.queryByTestId('comparador-propostas')).toBeNull();
    expect(screen.queryByText('Maria SST')).toBeNull();
  });

  it('conta paga ve o comparador com preco, prazo, avaliacoes e certificados', async () => {
    planoPagoMock.mockReturnValue(true);
    renderizar();
    await waitFor(() => expect(screen.getByTestId('comparador-propostas')).toBeTruthy());
    expect(screen.getByText('Maria SST')).toBeTruthy();
    expect(screen.getByText(/R\$ 4\.500/)).toBeTruthy();
    expect(screen.getByText(/Prazo: 15 dias/)).toBeTruthy();
    const comparador = screen.getByTestId('comparador-propostas');
    await waitFor(() => expect(comparador.textContent).toContain('4.5 (3 avaliações)'));
    expect(comparador.textContent).toContain('2 certificados visíveis');
    expect(screen.getByText('Aceitar')).toBeTruthy();
    expect(screen.getByText('Recusar')).toBeTruthy();
  });

  it('aceitar proposta chama o service com accepted', async () => {
    planoPagoMock.mockReturnValue(true);
    renderizar();
    await waitFor(() => expect(screen.getByText('Aceitar')).toBeTruthy());
    fireEvent.click(screen.getByText('Aceitar'));
    fireEvent.click(screen.getByText('Confirmar'));
    await waitFor(() => expect(atualizarStatusMock).toHaveBeenCalledWith('p1', 'accepted'));
  });
});
