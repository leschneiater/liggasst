import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProtectedRoute from '../ProtectedRoute';

const useAuthMock = vi.fn();

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

const authState = (overrides: Record<string, unknown>) => ({
  currentUser: null,
  userType: null,
  loading: false,
  ...overrides,
});

const verifiedUser = (type: 'professional' | 'company' | 'admin') => ({
  id: 'uid-1',
  email: 'teste@example.com',
  type,
  verified: true,
});

function renderRoute(initialPath: string, userType?: 'professional' | 'company' | 'admin') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/area"
          element={
            <ProtectedRoute userType={userType}>
              <div>conteúdo protegido</div>
            </ProtectedRoute>
          }
        />
        <Route path="/auth/login" element={<div>tela de login</div>} />
        <Route path="/dashboard-profissional" element={<div>painel profissional</div>} />
        <Route path="/dashboard-empresa" element={<div>painel empresa</div>} />
        <Route path="/admin" element={<div>painel admin</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
  });

  it('mostra o estado de carregamento enquanto a sessão é verificada', () => {
    useAuthMock.mockReturnValue(authState({ loading: true }));
    renderRoute('/area', 'company');
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
    expect(screen.queryByText('conteúdo protegido')).not.toBeInTheDocument();
  });

  it('redireciona visitante sem sessão para o login', () => {
    useAuthMock.mockReturnValue(authState({}));
    renderRoute('/area', 'company');
    expect(screen.getByText('tela de login')).toBeInTheDocument();
  });

  it('redireciona usuário não verificado para o login', () => {
    useAuthMock.mockReturnValue(
      authState({ currentUser: { ...verifiedUser('company'), verified: false }, userType: 'company' })
    );
    renderRoute('/area', 'company');
    expect(screen.getByText('tela de login')).toBeInTheDocument();
  });

  it('renderiza o conteúdo quando o papel bate com o da rota', () => {
    useAuthMock.mockReturnValue(
      authState({ currentUser: verifiedUser('company'), userType: 'company' })
    );
    renderRoute('/area', 'company');
    expect(screen.getByText('conteúdo protegido')).toBeInTheDocument();
  });

  it('redireciona profissional em rota de empresa para o próprio painel', () => {
    useAuthMock.mockReturnValue(
      authState({ currentUser: verifiedUser('professional'), userType: 'professional' })
    );
    renderRoute('/area', 'company');
    expect(screen.getByText('painel profissional')).toBeInTheDocument();
  });

  it('redireciona empresa em rota de profissional para o próprio painel', () => {
    useAuthMock.mockReturnValue(
      authState({ currentUser: verifiedUser('company'), userType: 'company' })
    );
    renderRoute('/area', 'professional');
    expect(screen.getByText('painel empresa')).toBeInTheDocument();
  });

  it('redireciona admin em rota de outro papel para o painel admin', () => {
    useAuthMock.mockReturnValue(
      authState({ currentUser: verifiedUser('admin'), userType: 'admin' })
    );
    renderRoute('/area', 'professional');
    expect(screen.getByText('painel admin')).toBeInTheDocument();
  });
});
