import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProporContrato from '../../pages/company/ProporContrato';

const getProfessionalPublicMock = vi.fn();
const fetchDemandsMock = vi.fn();
const createContractMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock('../../services/database', () => ({
  getProfessionalPublic: (...args: unknown[]) => getProfessionalPublicMock(...args),
  fetchDemands: (...args: unknown[]) => fetchDemandsMock(...args),
  createContract: (...args: unknown[]) => createContractMock(...args),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const profissional = {
  id: 'p1',
  nome: 'Ana Lima',
  formacao: 'Técnica em Segurança',
  cidade: 'Campinas',
  estado: 'SP',
  experiencia: 5,
  valorHora: 90,
  raioAtendimento: 50,
  especializacoes: ['PGR'],
  disponibilidade: [],
  descricao: '',
};

const demandaAtiva = {
  id: 'd1',
  company_id: 'empresa-1',
  title: 'Elaboração de PGR',
  description: 'desc',
  service_type: 'PGR',
  city: 'São Paulo',
  state: 'SP',
  budget: 4500,
  deadline: null,
  status: 'active',
  created_at: '2026-10-25T10:00:00Z',
};

const renderPagina = () =>
  render(
    <MemoryRouter initialEntries={['/propor-contrato/p1']}>
      <Routes>
        <Route path="/propor-contrato/:profissionalId" element={<ProporContrato />} />
        <Route path="/contratos-empresa" element={<p>destino</p>} />
      </Routes>
    </MemoryRouter>
  );

describe('ProporContrato', () => {
  beforeEach(() => {
    getProfessionalPublicMock.mockReset().mockResolvedValue(profissional);
    fetchDemandsMock.mockReset().mockResolvedValue({ success: true, data: [demandaAtiva] });
    createContractMock.mockReset().mockResolvedValue({ id: 'c-novo' });
    useAuthMock.mockReset().mockReturnValue({
      currentUser: { id: 'empresa-1' },
      userType: 'company',
      userData: {},
      loading: false,
    });
  });

  it('mostra o formulario completo com as acoes', async () => {
    renderPagina();
    expect(await screen.findByText(/Ana Lima/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Título do contrato/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Vincular a uma demanda/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Valor combinado/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Início previsto/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Término previsto/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar proposta' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeInTheDocument();
    expect(screen.getByText(/não processa pagamentos/)).toBeInTheDocument();
  });

  it('escolher demanda preenche o titulo vazio', async () => {
    renderPagina();
    await screen.findByText(/Ana Lima/);
    fireEvent.change(screen.getByLabelText(/Vincular a uma demanda/), { target: { value: 'd1' } });
    expect(screen.getByLabelText(/Título do contrato/)).toHaveDisplayValue('Elaboração de PGR');
  });

  it('envia proposta com valor em virgula convertido', async () => {
    renderPagina();
    await screen.findByText(/Ana Lima/);
    fireEvent.change(screen.getByLabelText(/Título do contrato/), { target: { value: 'Consultoria NR-35' } });
    fireEvent.change(screen.getByLabelText(/Vincular a uma demanda/), { target: { value: 'd1' } });
    fireEvent.change(screen.getByLabelText(/Valor combinado/), { target: { value: '4500,00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar proposta' }));
    await waitFor(() => expect(createContractMock).toHaveBeenCalled());
    expect(createContractMock).toHaveBeenCalledWith({
      professional_id: 'p1',
      demand_id: 'd1',
      title: 'Consultoria NR-35',
      amount: 4500,
      starts_at: null,
      ends_at: null,
    });
  });

  it('exige o titulo', async () => {
    renderPagina();
    await screen.findByText(/Ana Lima/);
    fireEvent.click(screen.getByRole('button', { name: 'Enviar proposta' }));
    expect(await screen.findByText('Informe o título do contrato')).toBeInTheDocument();
    expect(createContractMock).not.toHaveBeenCalled();
  });

  it('rejeita valor invalido', async () => {
    renderPagina();
    await screen.findByText(/Ana Lima/);
    fireEvent.change(screen.getByLabelText(/Título do contrato/), { target: { value: 'X' } });
    fireEvent.change(screen.getByLabelText(/Valor combinado/), { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar proposta' }));
    expect(await screen.findByText('Informe um valor numérico válido')).toBeInTheDocument();
    expect(createContractMock).not.toHaveBeenCalled();
  });
});
