import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ContratosProfissional from '../../pages/professional/ContratosProfissional';
import { ContratoRow } from '../../pages/company/contratoGestao';

const listarContratosMock = vi.fn();
const avaliacoesPendentesMock = vi.fn();
const minhasAvaliacoesMock = vi.fn();
const responderContratoMock = vi.fn();
const concluirContratoMock = vi.fn();
const cancelarContratoMock = vi.fn();

vi.mock('../../services/database', () => ({
  listarContratos: (...args: unknown[]) => listarContratosMock(...args),
  avaliacoesPendentes: (...args: unknown[]) => avaliacoesPendentesMock(...args),
  minhasAvaliacoes: (...args: unknown[]) => minhasAvaliacoesMock(...args),
  responderContrato: (...args: unknown[]) => responderContratoMock(...args),
  concluirContrato: (...args: unknown[]) => concluirContratoMock(...args),
  cancelarContrato: (...args: unknown[]) => cancelarContratoMock(...args),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const linha = (id: string, status: string, extra: Partial<ContratoRow> = {}): ContratoRow => ({
  id,
  demand_id: null,
  company_id: 'empresa-1',
  professional_id: 'prof-1',
  status,
  title: `Contrato ${id}`,
  amount: null,
  starts_at: null,
  ends_at: null,
  progress: 0,
  created_at: '2026-10-29T10:00:00Z',
  contraparte_nome: 'TechCorp Ltda',
  demanda_titulo: null,
  ...extra,
});

const renderPagina = () =>
  render(
    <MemoryRouter>
      <ContratosProfissional />
    </MemoryRouter>
  );

describe('ContratosProfissional', () => {
  beforeEach(() => {
    listarContratosMock.mockReset();
    avaliacoesPendentesMock.mockReset().mockResolvedValue([]);
    minhasAvaliacoesMock.mockReset().mockResolvedValue([]);
    responderContratoMock.mockReset().mockResolvedValue(undefined);
    concluirContratoMock.mockReset().mockResolvedValue(undefined);
    cancelarContratoMock.mockReset().mockResolvedValue(undefined);
  });

  it('profissional aceita proposta pendente com confirmacao', async () => {
    listarContratosMock.mockResolvedValue([
      linha('c1', 'pending', { demand_id: 'd1', demanda_titulo: 'Elaboração de PGR' }),
    ]);
    renderPagina();
    await screen.findByText('Contrato c1');
    fireEvent.click(screen.getByRole('button', { name: 'Aceitar' }));
    // O texto de confirmacao avisa que a demanda sai da vitrine.
    expect(screen.getByText(/sai da vitrine pública/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(responderContratoMock).toHaveBeenCalledWith('c1', 'aceitar'));
  });

  it('profissional recusa proposta pendente', async () => {
    listarContratosMock.mockResolvedValue([linha('c1', 'pending')]);
    renderPagina();
    await screen.findByText('Contrato c1');
    fireEvent.click(screen.getByRole('button', { name: 'Recusar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(responderContratoMock).toHaveBeenCalledWith('c1', 'recusar'));
  });

  it('profissional nao conclui contrato: so cancela o em andamento', async () => {
    listarContratosMock.mockResolvedValue([linha('c2', 'in_progress')]);
    renderPagina();
    await screen.findByText('Contrato c2');
    expect(screen.queryByRole('button', { name: 'Concluir' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
  });

  it('estado vazio honesto com saida para as demandas', async () => {
    listarContratosMock.mockResolvedValue([]);
    renderPagina();
    expect(await screen.findByText('Nenhum contrato por aqui ainda')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver demandas disponíveis' })).toBeInTheDocument();
  });
});
