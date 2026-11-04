// /planos com conta logada (bug relatado por ela 04/11: "logada, ao entrar
// em Planos precisa logar de novo"): os botoes nao abrem mais o modal de
// cadastro; "Assinar" leva para a pagina de assinatura do papel da conta
// (checkout real) e "Comecar Gratis" leva para o painel. Visitante segue
// vendo o modal de cadastro. Texto dos botoes inalterado (/planos congelado
// para texto).
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Planos from '../Planos';

const navegar = vi.fn();
vi.mock('react-router-dom', async () => {
  const real = await vi.importActual('react-router-dom');
  return { ...real, useNavigate: () => navegar };
});

const estado: { logado: boolean; role: string | null } = { logado: false, role: null };
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    currentUser: estado.logado ? { id: 'u1', verified: true } : null,
    userType: estado.role,
    loading: false,
  }),
}));

// Os modais de cadastro sao pesados; basta saber se abririam.
vi.mock('../../components/CadastroEmpresaModal', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="modal-cadastro-empresa" /> : null),
}));
vi.mock('../../components/CadastroProfissionalModal', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="modal-cadastro-profissional" /> : null),
}));

describe('/planos logado', () => {
  beforeEach(() => {
    navegar.mockClear();
    // producao compila com VITE_BILLING_CONTRACT_ENABLED=true (botao "Assinar")
    vi.stubEnv('VITE_BILLING_CONTRACT_ENABLED', 'true');
  });

  it('empresa logada: Assinar leva para /assinatura-empresa, sem modal de cadastro', () => {
    estado.logado = true; estado.role = 'company';
    render(<MemoryRouter><Planos /></MemoryRouter>);
    fireEvent.click(screen.getAllByRole('button', { name: 'Assinar' })[0]);
    expect(navegar).toHaveBeenCalledWith('/assinatura-empresa');
    expect(screen.queryByTestId('modal-cadastro-empresa')).not.toBeInTheDocument();
    expect(screen.queryByTestId('modal-cadastro-profissional')).not.toBeInTheDocument();
  });

  it('profissional logado: Assinar leva para /assinatura-profissional', () => {
    estado.logado = true; estado.role = 'professional';
    render(<MemoryRouter><Planos /></MemoryRouter>);
    fireEvent.click(screen.getAllByRole('button', { name: 'Assinar' })[0]);
    expect(navegar).toHaveBeenCalledWith('/assinatura-profissional');
  });

  it('conta logada: "Comecar Gratis" leva para o painel, nao para cadastro', () => {
    estado.logado = true; estado.role = 'company';
    render(<MemoryRouter><Planos /></MemoryRouter>);
    fireEvent.click(screen.getAllByRole('button', { name: 'Começar Grátis' })[0]);
    expect(navegar).toHaveBeenCalledWith('/dashboard-empresa');
    expect(screen.queryByTestId('modal-cadastro-empresa')).not.toBeInTheDocument();
  });

  it('visitante: botoes seguem abrindo o modal de cadastro', () => {
    estado.logado = false; estado.role = null;
    render(<MemoryRouter><Planos /></MemoryRouter>);
    // visao padrao: profissional; o toggle muda para empresa
    fireEvent.click(screen.getAllByRole('button', { name: 'Assinar' })[0]);
    expect(screen.getByTestId('modal-cadastro-profissional')).toBeInTheDocument();
    expect(navegar).not.toHaveBeenCalled();
  });
});
