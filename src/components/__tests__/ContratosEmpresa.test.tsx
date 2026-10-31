import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ContratosEmpresa from '../../pages/company/ContratosEmpresa';
import { ContratoRow } from '../../pages/company/contratoGestao';

const listarContratosMock = vi.fn();
const responderContratoMock = vi.fn();
const concluirContratoMock = vi.fn();
const cancelarContratoMock = vi.fn();

vi.mock('../../services/database', () => ({
  listarContratos: (...args: unknown[]) => listarContratosMock(...args),
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
  amount: 4500,
  starts_at: null,
  ends_at: null,
  progress: 0,
  created_at: '2026-10-29T10:00:00Z',
  contraparte_nome: 'Ana Lima',
  demanda_titulo: null,
  ...extra,
});

const renderPagina = () =>
  render(
    <MemoryRouter>
      <ContratosEmpresa />
    </MemoryRouter>
  );

describe('ContratosEmpresa', () => {
  beforeEach(() => {
    listarContratosMock.mockReset();
    responderContratoMock.mockReset().mockResolvedValue(undefined);
    concluirContratoMock.mockReset().mockResolvedValue(undefined);
    cancelarContratoMock.mockReset().mockResolvedValue(undefined);
  });

  it('agrupa contratos por etapa e mostra dados da contraparte', async () => {
    listarContratosMock.mockResolvedValue([
      linha('c1', 'pending', { demanda_titulo: 'PGR matriz' }),
      linha('c2', 'in_progress'),
      linha('c3', 'completed'),
    ]);
    renderPagina();
    expect(await screen.findByText('Contrato c1')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Aguardando resposta' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Em andamento' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Histórico' })).toBeInTheDocument();
    expect(screen.getAllByText(/Ana Lima/).length).toBe(3);
    expect(screen.getByText(/PGR matriz/)).toBeInTheDocument();
    expect(screen.getAllByText(/R\$ 4\.500,00/).length).toBeGreaterThan(0);
  });

  it('empresa nao responde proposta pendente: so pode cancelar', async () => {
    listarContratosMock.mockResolvedValue([linha('c1', 'pending')]);
    renderPagina();
    await screen.findByText('Contrato c1');
    expect(screen.queryByRole('button', { name: 'Aceitar' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
  });

  it('concluir pede confirmacao e chama a RPC', async () => {
    listarContratosMock.mockResolvedValue([linha('c2', 'in_progress')]);
    renderPagina();
    await screen.findByText('Contrato c2');
    fireEvent.click(screen.getByRole('button', { name: 'Concluir' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(concluirContratoMock).toHaveBeenCalledWith('c2'));
  });

  it('encerrados nao mostram acoes', async () => {
    listarContratosMock.mockResolvedValue([linha('c3', 'cancelled')]);
    renderPagina();
    await screen.findByText('Contrato c3');
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Concluir' })).not.toBeInTheDocument();
  });

  it('estado vazio honesto com saida para a busca', async () => {
    listarContratosMock.mockResolvedValue([]);
    renderPagina();
    expect(await screen.findByText('Nenhum contrato por aqui ainda')).toBeInTheDocument();
    expect(screen.getByText(/sem dados de exemplo/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Buscar profissionais' })).toBeInTheDocument();
  });
});
