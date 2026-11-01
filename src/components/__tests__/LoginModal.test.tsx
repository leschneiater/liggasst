// LoginModal: o botao "Entrar com Google" usa o MESMO loginWithOAuth do
// /auth/login (contas novas completam o cadastro apos o primeiro acesso).
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import LoginModal from '../LoginModal';

const loginMock = vi.fn();
const loginWithOAuthMock = vi.fn();
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ login: loginMock, loginWithOAuth: loginWithOAuthMock, loading: false }),
}));

const abrir = () =>
  render(
    <MemoryRouter>
      <LoginModal isOpen onClose={() => {}} onOpenCadastroEmpresa={() => {}} onOpenCadastroProfissional={() => {}} />
    </MemoryRouter>
  );

describe('LoginModal', () => {
  it('oferece Entrar com Google alem de email/senha', () => {
    abrir();
    expect(screen.getByText('Entrar com Google')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeTruthy();
  });

  it('clique chama loginWithOAuth("google"), o mesmo da pagina de login', () => {
    abrir();
    fireEvent.click(screen.getByText('Entrar com Google'));
    expect(loginWithOAuthMock).toHaveBeenCalledWith('google');
  });

  it('fechado nao renderiza nada', () => {
    const { container } = render(
      <MemoryRouter>
        <LoginModal isOpen={false} onClose={() => {}} onOpenCadastroEmpresa={() => {}} onOpenCadastroProfissional={() => {}} />
      </MemoryRouter>
    );
    expect(container.innerHTML).toBe('');
  });
});
