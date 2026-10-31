import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AvaliacaoContrato from '../contratos/AvaliacaoContrato';
import { AvaliacaoPendente, AvaliacaoRow } from '../contratos/avaliacaoGestao';

const avaliarContratoMock = vi.fn();
const corrigirAvaliacaoMock = vi.fn();

vi.mock('../../services/database', () => ({
  avaliarContrato: (...args: unknown[]) => avaliarContratoMock(...args),
  corrigirAvaliacao: (...args: unknown[]) => corrigirAvaliacaoMock(...args),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('react-hot-toast', () => ({
  default: { success: (...a: unknown[]) => toastSuccess(...a), error: (...a: unknown[]) => toastError(...a) },
}));

const pendente: AvaliacaoPendente = {
  contract_id: 'c1',
  contraparte_nome: 'Ana Lima',
  contrato_titulo: 'Contrato c1',
  concluido_em: '2026-10-20T10:00:00Z',
  prazo_fim: '2026-11-03T10:00:00Z',
};

const feita: AvaliacaoRow = {
  id: 'r1',
  contract_id: 'c1',
  direcao: 'feita',
  score: 4,
  comment: 'Bom trabalho',
  comentario_oculto: false,
  created_at: '2026-10-21T10:00:00Z',
  contraparte_nome: 'Ana Lima',
  contrato_titulo: 'Contrato c1',
};

const base = {
  contractId: 'c1',
  statusContrato: 'completed',
  contraparteNome: 'Ana Lima',
  onAtualizar: vi.fn(),
};

describe('AvaliacaoContrato', () => {
  beforeEach(() => {
    avaliarContratoMock.mockReset().mockResolvedValue(undefined);
    corrigirAvaliacaoMock.mockReset().mockResolvedValue(undefined);
    toastSuccess.mockReset();
    toastError.mockReset();
    base.onAtualizar = vi.fn();
  });

  it('nada mostra para contrato não concluído', () => {
    const { container } = render(<AvaliacaoContrato {...base} statusContrato="in_progress" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('contrato concluído pendente: botão Avaliar com data limite', () => {
    render(<AvaliacaoContrato {...base} pendente={pendente} />);
    expect(screen.getByRole('button', { name: 'Avaliar' })).toBeInTheDocument();
    expect(screen.getByText(/Avalie até/)).toBeInTheDocument();
  });

  it('enviar sem nota mostra erro e não chama a RPC', async () => {
    render(<AvaliacaoContrato {...base} pendente={pendente} />);
    fireEvent.click(screen.getByRole('button', { name: 'Avaliar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar avaliação' }));
    expect(toastError).toHaveBeenCalledWith('Escolha uma nota de 1 a 5 estrelas.');
    expect(avaliarContratoMock).not.toHaveBeenCalled();
  });

  it('envia avaliação com nota e comentário opcional', async () => {
    render(<AvaliacaoContrato {...base} pendente={pendente} />);
    fireEvent.click(screen.getByRole('button', { name: 'Avaliar' }));
    fireEvent.click(screen.getByRole('button', { name: '5 estrelas' }));
    fireEvent.change(screen.getByPlaceholderText('Comentário opcional'), { target: { value: '  Ótimo! ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar avaliação' }));
    await waitFor(() => expect(avaliarContratoMock).toHaveBeenCalledWith('c1', 5, 'Ótimo!'));
    expect(toastSuccess).toHaveBeenCalled();
    expect(base.onAtualizar).toHaveBeenCalled();
  });

  it('avaliação enviada oculta: mostra nota e permite corrigir', async () => {
    render(<AvaliacaoContrato {...base} feita={feita} />);
    expect(screen.getByText(/Sua avaliação \(oculta/)).toBeInTheDocument();
    expect(screen.getByText('Bom trabalho')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Corrigir avaliação' }));
    fireEvent.click(screen.getByRole('button', { name: '5 estrelas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar correção' }));
    await waitFor(() => expect(corrigirAvaliacaoMock).toHaveBeenCalledWith('c1', 5, 'Bom trabalho'));
  });

  it('revelada: mostra nota sem opção de corrigir', () => {
    const recebida: AvaliacaoRow = { ...feita, id: 'r2', direcao: 'recebida' };
    render(<AvaliacaoContrato {...base} feita={feita} recebida={recebida} />);
    expect(screen.queryByRole('button', { name: 'Corrigir avaliação' })).not.toBeInTheDocument();
    expect(screen.getByText('Sua avaliação:')).toBeInTheDocument();
  });

  it('prazo encerrado: aviso sem ações', () => {
    render(<AvaliacaoContrato {...base} />);
    expect(screen.getByText('Prazo de avaliação encerrado.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Avaliar' })).not.toBeInTheDocument();
  });

  it('erro da RPC vira mensagem amigável', async () => {
    avaliarContratoMock.mockRejectedValue(new Error('o prazo para avaliar este contrato terminou'));
    render(<AvaliacaoContrato {...base} pendente={pendente} />);
    fireEvent.click(screen.getByRole('button', { name: 'Avaliar' }));
    fireEvent.click(screen.getByRole('button', { name: '4 estrelas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar avaliação' }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('O prazo de 14 dias para avaliar este contrato terminou.'));
  });
});
