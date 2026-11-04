// Formulario de proposta do profissional na lista de demandas: validacao,
// envio e estado "proposta enviada". O chat livre continua disponivel.
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DemandasDisponiveis from '../../pages/professional/DemandasDisponiveis';

const fetchDemandsMock = vi.fn();
const fetchCompaniesMock = vi.fn();
const enviarPropostaMock = vi.fn();
const fetchMinhasPropostasMock = vi.fn();
const toastError = vi.fn();
const toastSuccess = vi.fn();

vi.mock('../../services/database', () => ({
  fetchDemands: (...a: unknown[]) => fetchDemandsMock(...a),
  fetchCompanies: (...a: unknown[]) => fetchCompaniesMock(...a),
}));
vi.mock('../../services/propostas', () => ({
  enviarProposta: (...a: unknown[]) => enviarPropostaMock(...a),
  fetchMinhasPropostas: (...a: unknown[]) => fetchMinhasPropostasMock(...a),
}));
vi.mock('../../hooks/useMessagingDisponivel', () => ({
  useMessagingDisponivel: () => ({ disponivel: true }),
}));
vi.mock('react-hot-toast', () => ({
  default: { success: (...a: unknown[]) => toastSuccess(...a), error: (...a: unknown[]) => toastError(...a) },
}));

const demanda = {
  id: 'd1', company_id: 'emp-1', title: 'PGR para fábrica', description: 'desc',
  service_type: 'PGR', city: 'São Paulo', state: 'SP', budget: null, deadline: null,
  status: 'active', created_at: '2026-11-01T10:00:00Z',
};

const renderizar = () =>
  render(
    <MemoryRouter>
      <DemandasDisponiveis />
    </MemoryRouter>,
  );

describe('DemandasDisponiveis - proposta', () => {
  beforeEach(() => {
    fetchDemandsMock.mockReset().mockResolvedValue({ success: true, data: [demanda] });
    fetchCompaniesMock.mockReset().mockResolvedValue({ success: true, data: [] });
    fetchMinhasPropostasMock.mockReset().mockResolvedValue({ success: true, data: [] });
    enviarPropostaMock.mockReset().mockResolvedValue({ success: true, data: {} });
    toastError.mockReset();
    toastSuccess.mockReset();
  });

  it('valida mensagem curta antes de enviar', async () => {
    renderizar();
    await waitFor(() => expect(screen.getByText('Enviar Proposta')).toBeTruthy());
    fireEvent.click(screen.getByText('Enviar Proposta'));
    fireEvent.change(screen.getByPlaceholderText(/O que você entrega/), { target: { value: 'oi' } });
    fireEvent.click(screen.getByText('Enviar'));
    expect(toastError).toHaveBeenCalled();
    expect(enviarPropostaMock).not.toHaveBeenCalled();
  });

  it('envia proposta valida e mostra estado enviado', async () => {
    renderizar();
    await waitFor(() => expect(screen.getByText('Enviar Proposta')).toBeTruthy());
    fireEvent.click(screen.getByText('Enviar Proposta'));
    fireEvent.change(screen.getByPlaceholderText('A combinar'), { target: { value: '4500' } });
    fireEvent.change(screen.getByPlaceholderText('Ex.: 15'), { target: { value: '15' } });
    fireEvent.change(screen.getByPlaceholderText(/O que você entrega/), { target: { value: 'Executo o PGR completo com visita.' } });
    fireEvent.click(screen.getByText('Enviar'));
    await waitFor(() => expect(enviarPropostaMock).toHaveBeenCalledWith({
      demandId: 'd1', amount: 4500, deadlineDays: 15, message: 'Executo o PGR completo com visita.',
    }));
    await waitFor(() => expect(screen.getByTestId('proposta-enviada-d1')).toBeTruthy());
  });

  it('marca como enviada quando o banco recusa duplicada', async () => {
    enviarPropostaMock.mockResolvedValue({ success: false, duplicada: true, error: new Error('dup') });
    renderizar();
    await waitFor(() => expect(screen.getByText('Enviar Proposta')).toBeTruthy());
    fireEvent.click(screen.getByText('Enviar Proposta'));
    fireEvent.change(screen.getByPlaceholderText(/O que você entrega/), { target: { value: 'Executo o PGR completo com visita.' } });
    fireEvent.click(screen.getByText('Enviar'));
    await waitFor(() => expect(screen.getByTestId('proposta-enviada-d1')).toBeTruthy());
  });

  it('demanda com proposta existente ja abre marcada', async () => {
    fetchMinhasPropostasMock.mockResolvedValue({ success: true, data: [{ demand_id: 'd1' }] });
    renderizar();
    await waitFor(() => expect(screen.getByTestId('proposta-enviada-d1')).toBeTruthy());
    expect(screen.queryByText('Enviar Proposta')).toBeNull();
  });
});
