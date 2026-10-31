import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EditarDemanda from '../../pages/company/EditarDemanda';

const fetchDemandsMock = vi.fn();
const updateDemandMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock('../../services/database', () => ({
  fetchDemands: (...args: unknown[]) => fetchDemandsMock(...args),
  updateDemand: (...args: unknown[]) => updateDemandMock(...args),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const demandaAtiva = {
  id: 'd1',
  company_id: 'empresa-1',
  title: 'Elaboração de PGR',
  description: 'Descrição original',
  service_type: 'PGR - Programa de Gerenciamento de Riscos',
  city: 'São Paulo',
  state: 'SP',
  budget: 4500,
  deadline: '2026-11-30',
  status: 'active',
  modalidade: 'presencial',
  urgencia: 'media',
  tipo_orcamento: 'fixo',
  created_at: '2026-10-25T10:00:00Z',
};

const renderPagina = () =>
  render(
    <MemoryRouter initialEntries={['/editar-demanda/d1']}>
      <Routes>
        <Route path="/editar-demanda/:id" element={<EditarDemanda />} />
      </Routes>
    </MemoryRouter>
  );

describe('EditarDemanda', () => {
  beforeEach(() => {
    fetchDemandsMock.mockReset().mockResolvedValue({ success: true, data: [demandaAtiva] });
    updateDemandMock.mockReset().mockResolvedValue({ success: true, data: demandaAtiva });
    useAuthMock.mockReset().mockReturnValue({
      currentUser: { id: 'empresa-1' },
      userType: 'company',
      userData: {},
      loading: false,
    });
  });

  it('preenche o formulário com os dados atuais da demanda', async () => {
    renderPagina();
    expect(await screen.findByDisplayValue('Elaboração de PGR')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Descrição original')).toBeInTheDocument();
    expect(screen.getByDisplayValue('São Paulo')).toBeInTheDocument();
    expect(screen.getByDisplayValue('4500')).toBeInTheDocument();
  });

  it('salva as alterações via updateDemand com os campos mapeados', async () => {
    renderPagina();
    const titulo = await screen.findByDisplayValue('Elaboração de PGR');
    fireEvent.change(titulo, { target: { value: 'PGR atualizado' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar alterações/i }));
    await waitFor(() => expect(updateDemandMock).toHaveBeenCalled());
    const [id, campos] = updateDemandMock.mock.calls[0];
    expect(id).toBe('d1');
    expect(campos).toMatchObject({
      title: 'PGR atualizado',
      city: 'São Paulo',
      state: 'SP',
      budget: 4500,
      deadline: '2026-11-30',
      modalidade: 'presencial',
      urgencia: 'media',
      tipo_orcamento: 'fixo',
    });
  });

  it('bloqueia demanda de outra empresa sem chamar update', async () => {
    fetchDemandsMock.mockResolvedValue({ success: true, data: [{ ...demandaAtiva, company_id: 'outra-empresa' }] });
    renderPagina();
    expect(await screen.findByText(/não está entre as demandas da sua empresa/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /salvar alterações/i })).not.toBeInTheDocument();
  });

  it('não permite editar demanda que não está ativa', async () => {
    fetchDemandsMock.mockResolvedValue({ success: true, data: [{ ...demandaAtiva, status: 'completed' }] });
    renderPagina();
    expect(await screen.findByText(/não pode mais ser editada/i)).toBeInTheDocument();
    expect(updateDemandMock).not.toHaveBeenCalled();
  });
});
