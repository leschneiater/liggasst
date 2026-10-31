import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CadastroProfissionalModal from '../CadastroProfissionalModal';

const signupMock = vi.fn();

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ signup: signupMock }),
}));

const abrirModal = () =>
  render(
    <MemoryRouter>
      <CadastroProfissionalModal isOpen onClose={() => {}} />
    </MemoryRouter>
  );

const preencher = (re: RegExp, v: string) =>
  fireEvent.change(screen.getByLabelText(re), { target: { value: v } });

const preencherObrigatorios = () => {
  preencher(/nome completo/i, 'Ana Teste');
  preencher(/cpf/i, '12345678901');
  preencher(/^e-mail/i, 'ana@teste.com');
  preencher(/telefone/i, '11999999999');
  preencher(/^senha/i, 'senha123456');
  preencher(/confirmar senha/i, 'senha123456');
  preencher(/cep/i, '01001000');
  preencher(/cidade/i, 'São Paulo');
  preencher(/endereço/i, 'Rua A, 1');
  preencher(/registro profissional/i, 'CRT-123');
  const selects = screen.getAllByRole('combobox');
  fireEvent.change(selects[0], { target: { value: 'SP' } });
  fireEvent.change(selects[1], { target: { value: 'Técnico em Segurança do Trabalho' } });
  fireEvent.click(document.querySelector('input[name="termosAceitos"]')!);
};

const enviar = () => fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));

describe('CadastroProfissionalModal - indicação persistente de erros', () => {
  beforeEach(() => {
    signupMock.mockReset().mockResolvedValue(undefined);
  });

  it('mantém erro visível junto a Experiência e Raio e resume acima do botão ao enviar sem eles', async () => {
    abrirModal();
    preencherObrigatorios();
    enviar();

    expect((await screen.findAllByText('Experiência é obrigatória')).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Raio de atendimento é obrigatório').length).toBeGreaterThanOrEqual(1);

    const resumo = await screen.findByText(/Não foi possível criar a conta/);
    expect(resumo).toBeInTheDocument();
    expect(screen.getByText('Experiência (anos):')).toBeInTheDocument();
    expect(screen.getByText('Raio de Atendimento (km):')).toBeInTheDocument();
    expect(signupMock).not.toHaveBeenCalled();
  });

  it('mantém o erro visível até o campo ser preenchido', async () => {
    abrirModal();
    preencherObrigatorios();
    enviar();
    expect((await screen.findAllByText('Experiência é obrigatória')).length).toBeGreaterThanOrEqual(1);

    fireEvent.change(screen.getByLabelText(/experiência \(anos\)/i), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText(/raio de atendimento/i), { target: { value: '30' } });

    await waitFor(() => {
      expect(screen.queryByText('Experiência é obrigatória')).not.toBeInTheDocument();
      expect(screen.queryByText('Raio de atendimento é obrigatório')).not.toBeInTheDocument();
      expect(screen.queryByText(/Não foi possível criar a conta/)).not.toBeInTheDocument();
    });

    enviar();
    await waitFor(() => expect(signupMock).toHaveBeenCalledTimes(1));
  });

  it('exige aceite dos termos com erro persistente (sem balão nativo que some)', async () => {
    abrirModal();
    preencherObrigatorios();
    fireEvent.click(document.querySelector('input[name="termosAceitos"]')!); // desmarca
    preencher(/experiência \(anos\)/i, '5');
    preencher(/raio de atendimento/i, '30');
    enviar();

    expect(
      (await screen.findAllByText('É necessário aceitar os Termos de Uso e a Política de Privacidade')).length
    ).toBeGreaterThanOrEqual(1);
    expect(signupMock).not.toHaveBeenCalled();
  });

  it('envia o cadastro quando tudo está preenchido', async () => {
    abrirModal();
    preencherObrigatorios();
    preencher(/experiência \(anos\)/i, '5');
    preencher(/raio de atendimento/i, '30');
    enviar();

    await waitFor(() => expect(signupMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/Não foi possível criar a conta/)).not.toBeInTheDocument();
  });
});
