import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const enviar = vi.fn();
const sucesso = vi.fn();
const erro = vi.fn();
vi.mock('../../services/contatos', () => ({ enviarContato: (d: unknown) => enviar(d) }));
vi.mock('react-hot-toast', () => ({ default: { success: (m: string) => sucesso(m), error: (m: string) => erro(m) } }));
import Contato from '../Contato';

function preencher() {
  fireEvent.change(screen.getByPlaceholderText('Seu nome'), { target: { value: 'Ana' } });
  fireEvent.change(screen.getByPlaceholderText('seu@email.com'), { target: { value: 'ana@exemplo.com' } });
  fireEvent.change(screen.getByPlaceholderText('Sobre o que você gostaria de falar?'), { target: { value: 'Dúvida' } });
  fireEvent.change(screen.getByPlaceholderText('Descreva sua dúvida ou solicitação...'), { target: { value: 'Preciso de ajuda com a conta.' } });
}

describe('formulario de Contato', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sucesso so depois da gravacao confirmada; limpa o formulario', async () => {
    enviar.mockResolvedValue({ ok: true });
    render(<Contato />);
    preencher();
    fireEvent.click(screen.getByRole('button', { name: /Enviar Mensagem/ }));
    await waitFor(() => expect(sucesso).toHaveBeenCalledWith('Mensagem recebida. Vamos responder pelo e-mail que você informou.'));
    expect((screen.getByPlaceholderText('Seu nome') as HTMLInputElement).value).toBe('');
    expect(enviar.mock.calls[0][0].site ?? '').toBe('');
  });

  it.each([
    ['falha', 'Não foi possível enviar agora. Tente de novo ou escreva para contato@liggasst.com.br.'],
    ['limite', 'Muitas mensagens em pouco tempo. Tente de novo mais tarde.'],
    ['invalido', 'Confira os campos e tente de novo.'],
  ])('%s: mostra o erro e NAO limpa o formulario', async (motivo, texto) => {
    enviar.mockResolvedValue({ ok: false, motivo });
    render(<Contato />);
    preencher();
    fireEvent.click(screen.getByRole('button', { name: /Enviar Mensagem/ }));
    await waitFor(() => expect(erro).toHaveBeenCalledWith(texto));
    expect(sucesso).not.toHaveBeenCalled();
    expect((screen.getByPlaceholderText('Seu nome') as HTMLInputElement).value).toBe('Ana');
  });

  it('aviso de privacidade com seguranca e link; promessa de 24h trocada pelo texto aprovado', () => {
    render(<Contato />);
    expect(screen.getByTestId('aviso-contato').textContent).toBe('Usamos seus dados para responder esta mensagem e para proteger o formulário contra spam e abuso. Veja a Política de Privacidade.');
    expect(screen.getByText('Respondemos pelo e-mail informado, em dias úteis.')).toBeTruthy();
    expect(screen.queryByText(/24 horas/)).toBeNull();
  });
});
