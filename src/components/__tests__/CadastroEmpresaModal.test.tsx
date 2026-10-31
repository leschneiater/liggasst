import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CadastroEmpresaModal from '../CadastroEmpresaModal';

const signupMock = vi.fn();

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ signup: signupMock }),
}));

const preencher = (re: RegExp, v: string) =>
  fireEvent.change(screen.getByLabelText(re), { target: { value: v } });

describe('CadastroEmpresaModal - indicação persistente de erros', () => {
  beforeEach(() => {
    signupMock.mockReset().mockResolvedValue(undefined);
    render(
      <MemoryRouter>
        <CadastroEmpresaModal isOpen onClose={() => {}} />
      </MemoryRouter>
    );
    preencher(/nome da empresa/i, 'Empresa Teste');
    preencher(/cnpj/i, '11222333000181');
    preencher(/e-mail da empresa/i, 'contato@empresa.com');
    preencher(/^telefone$/i, '1133334444');
    preencher(/^senha/i, 'senha123456');
    preencher(/confirmar senha/i, 'senha123456');
    preencher(/cep/i, '01001000');
    preencher(/cidade/i, 'São Paulo');
    preencher(/endereço/i, 'Rua A, 1');
    preencher(/nome do responsável/i, 'Carlos');
    preencher(/^cargo$/i, 'Sócio');
    preencher(/e-mail do responsável/i, 'carlos@empresa.com');
    preencher(/telefone do responsável/i, '11988887777');
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'SP' } });
    fireEvent.change(selects[1], { target: { value: 'Indústria Química' } });
    fireEvent.change(selects[2], { target: { value: '11-50' } });
  });

  it('mantém resumo de erros visível e não envia sem aceite dos termos', async () => {
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

    expect(
      (await screen.findAllByText('É necessário aceitar os Termos de Uso e a Política de Privacidade')).length
    ).toBeGreaterThanOrEqual(1);
    expect(await screen.findByText(/Não foi possível criar a conta/)).toBeInTheDocument();
    expect(signupMock).not.toHaveBeenCalled();
  });

  it('envia o cadastro quando tudo está preenchido e os termos aceitos', async () => {
    fireEvent.click(document.querySelector('input[name="termosAceitos"]')!);
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

    await waitFor(() => expect(signupMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/Não foi possível criar a conta/)).not.toBeInTheDocument();
  });
});
