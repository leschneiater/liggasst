import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthProvider, useAuth } from '../AuthContext';

const getSessionMock = vi.fn();
const signInWithPasswordMock = vi.fn();
const onAuthStateChangeMock = vi.fn();
const singleMock = vi.fn();
const maybeSingleMock = vi.fn();

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => getSessionMock(...args),
      signInWithPassword: (...args: unknown[]) => signInWithPasswordMock(...args),
      onAuthStateChange: (...args: unknown[]) => onAuthStateChangeMock(...args),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({ single: singleMock, maybeSingle: maybeSingleMock }),
      }),
    }),
    storage: { from: () => ({ createSignedUrl: vi.fn() }) },
  },
}));

const authUser = {
  id: 'u1',
  email: 'ana@teste.com',
  created_at: '2026-10-31T10:00:00Z',
  updated_at: '2026-10-31T10:00:00Z',
  last_sign_in_at: null,
  email_confirmed_at: null,
};

const perfilProfissional = {
  id: 'u1',
  email: 'ana@teste.com',
  role: 'professional',
  display_name: 'Ana',
  phone: null,
  postal_code: null,
  city: null,
  state: null,
  address: null,
  avatar_path: null,
  verification_status: 'approved',
  created_at: '2026-10-31T10:00:00Z',
  updated_at: '2026-10-31T10:00:00Z',
};

const Consumidor = () => {
  const { login, currentUser } = useAuth();
  return (
    <div>
      <button onClick={() => { login('ana@teste.com', 'senha123456').catch(() => {}); }}>
        entrar
      </button>
      <span data-testid="email">{currentUser?.email ?? 'deslogado'}</span>
    </div>
  );
};

const renderizar = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <Consumidor />
      </AuthProvider>
    </MemoryRouter>
  );

describe('AuthContext - nova tentativa ao carregar o perfil no login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    getSessionMock.mockResolvedValue({ data: { session: null }, error: null });
    onAuthStateChangeMock.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    signInWithPasswordMock.mockResolvedValue({
      data: { session: { user: authUser }, user: authUser },
      error: null,
    });
    maybeSingleMock.mockResolvedValue({ data: { cpf: '123' }, error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('conclui o login quando a falha é transitória e a segunda tentativa funciona', async () => {
    singleMock
      .mockResolvedValueOnce({ data: null, error: { message: 'fetch failed', code: 'PGRST301' } })
      .mockResolvedValue({ data: perfilProfissional, error: null });

    renderizar();
    fireEvent.click(screen.getByText('entrar'));

    await waitFor(() => expect(screen.getByTestId('email').textContent).toBe('ana@teste.com'), {
      timeout: 5000,
    });
    expect(singleMock).toHaveBeenCalledTimes(2);
  });

  it('mantém o erro quando a falha persiste após a nova tentativa', async () => {
    singleMock.mockResolvedValue({ data: null, error: { message: 'fetch failed', code: 'PGRST301' } });

    renderizar();
    fireEvent.click(screen.getByText('entrar'));

    await waitFor(() => expect(singleMock).toHaveBeenCalledTimes(2), { timeout: 5000 });
    expect(screen.getByTestId('email').textContent).toBe('deslogado');
  });
});
