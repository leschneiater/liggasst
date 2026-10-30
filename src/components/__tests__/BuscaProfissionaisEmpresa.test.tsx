import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BuscaProfissionaisEmpresa from '../../pages/company/BuscaProfissionais';

const searchProfessionalsMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock('../../services/database', () => ({
  searchProfessionals: (...args: unknown[]) => searchProfessionalsMock(...args),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../../components/CadastroEmpresaModal', () => ({
  default: () => null,
}));

const empresaLogada = {
  currentUser: { id: 'empresa-1' },
  userType: 'company',
  loading: false,
};

const profissionalReal = {
  id: 'prof-1',
  nome: 'Ana Ribeiro',
  formacao: 'Técnica em Segurança do Trabalho',
  cidade: 'Campinas',
  estado: 'SP',
  experiencia: 6,
  valorHora: 90,
  raioAtendimento: 40,
  especializacoes: ['PGR'],
  disponibilidade: ['Manhã'],
  descricao: 'Profissional de SST.',
};

describe('BuscaProfissionais da area da empresa', () => {
  beforeEach(() => {
    searchProfessionalsMock.mockReset();
    useAuthMock.mockReset();
    useAuthMock.mockReturnValue(empresaLogada);
  });

  it('lista profissionais reais vindos da RPC', async () => {
    searchProfessionalsMock.mockResolvedValue([profissionalReal]);
    render(
      <MemoryRouter>
        <BuscaProfissionaisEmpresa />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('Ana Ribeiro')).toBeInTheDocument());
    expect(searchProfessionalsMock).toHaveBeenCalled();
  });

  it('nao contem os profissionais ficticios da versao de demonstracao', async () => {
    searchProfessionalsMock.mockResolvedValue([]);
    render(
      <MemoryRouter>
        <BuscaProfissionaisEmpresa />
      </MemoryRouter>
    );
    await waitFor(() => expect(searchProfessionalsMock).toHaveBeenCalled());
    expect(screen.queryByText('João Silva')).not.toBeInTheDocument();
    expect(screen.queryByText('Maria Santos')).not.toBeInTheDocument();
  });

  it('mostra estado vazio honesto quando a busca nao retorna resultados', async () => {
    searchProfessionalsMock.mockResolvedValue([]);
    render(
      <MemoryRouter>
        <BuscaProfissionaisEmpresa />
      </MemoryRouter>
    );
    await waitFor(() =>
      expect(screen.getByText('Nenhum profissional encontrado')).toBeInTheDocument()
    );
  });
});
