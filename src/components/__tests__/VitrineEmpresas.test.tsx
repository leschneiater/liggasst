// VitrineEmpresas: o CTA do card respeita a sessao.
// Antes mandava TODO MUNDO para /auth/login, mesmo logado (bug relatado
// pela Leticia em 01/11/2026: "pede para logar novamente").
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('../../services/database', () => ({
  fetchCompaniesPublic: vi.fn(async () => ({
    success: true,
    data: [{
      id: 'e1', display_name: 'Empresa Teste', segment: 'Indústria',
      city: 'São Paulo', state: 'SP', employee_count: 10, description: 'desc',
    }],
  })),
}));

let authState: { currentUser: null | { id: string }; userType: null | string } = {
  currentUser: null, userType: null,
};
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => authState }));

import VitrineEmpresas from '../../pages/VitrineEmpresas';

const renderPagina = () => render(<MemoryRouter><VitrineEmpresas /></MemoryRouter>);
const achaBotao = async () => screen.findByRole('button', { name: /detalhes e conversar/ });

describe('VitrineEmpresas CTA do card', () => {
  beforeEach(() => { navigateMock.mockClear(); });

  it('anonimo: botao leva a /auth/login', async () => {
    authState = { currentUser: null, userType: null };
    renderPagina();
    fireEvent.click(await achaBotao());
    expect(navigateMock).toHaveBeenCalledWith('/auth/login');
  });

  it('profissional logado: botao leva a /busca-empresas', async () => {
    authState = { currentUser: { id: 'u1' }, userType: 'professional' };
    renderPagina();
    fireEvent.click(await achaBotao());
    expect(navigateMock).toHaveBeenCalledWith('/busca-empresas');
  });

  it('empresa logada: card nao promete conversa (sem CTA)', async () => {
    authState = { currentUser: { id: 'u2' }, userType: 'company' };
    renderPagina();
    await screen.findByText('Empresa Teste');
    expect(screen.queryByRole('button', { name: /detalhes e conversar/ })).toBeNull();
  });

  it('admin logado: card nao promete conversa (sem CTA)', async () => {
    authState = { currentUser: { id: 'u3' }, userType: 'admin' };
    renderPagina();
    await screen.findByText('Empresa Teste');
    expect(screen.queryByRole('button', { name: /detalhes e conversar/ })).toBeNull();
  });
});
