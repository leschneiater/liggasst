import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let usuario: { id: string; type: 'company' | 'professional' | 'admin' } | null = null;
vi.mock('../AuthContext', () => ({
  useAuth: () => ({ currentUser: usuario, userType: usuario?.type ?? null }),
}));
vi.mock('../../hooks/useMessagingDisponivel', () => ({
  useMessagingDisponivel: () => ({ disponivel: true, carregando: false }),
}));

const fetchMessages = vi.fn();
const fetchMyBlocks = vi.fn();
const listarContratos = vi.fn();
vi.mock('../../services/database', () => ({
  fetchMessages: (...a: unknown[]) => fetchMessages(...a),
  fetchMyBlocks: (...a: unknown[]) => fetchMyBlocks(...a),
  listarContratos: (...a: unknown[]) => listarContratos(...a),
}));

import { AvisosProvider } from '../AvisosProvider';
import { useAvisos } from '../AvisosContext';

const Mostra: React.FC = () => {
  const a = useAvisos();
  return <div data-testid="n">{a.mensagensNovas}/{a.propostasPendentes}</div>;
};
const montar = () => render(
  <MemoryRouter><AvisosProvider><Mostra /></AvisosProvider></MemoryRouter>,
);
const msgs = (n: number, remetente = 'x') =>
  ({ success: true, data: Array.from({ length: n }, () => ({ sender_id: remetente, receiver_id: 'eu', read: false })) });
const semBloqueio = { success: true, data: [] };

beforeEach(() => {
  usuario = { id: 'eu', type: 'professional' };
  fetchMessages.mockReset(); fetchMyBlocks.mockReset(); listarContratos.mockReset();
  fetchMyBlocks.mockResolvedValue(semBloqueio);
  listarContratos.mockResolvedValue([{ status: 'pending' }]);
});

describe('AvisosProvider', () => {
  it('mostra mensagens nao lidas e propostas pendentes do profissional', async () => {
    fetchMessages.mockResolvedValue(msgs(3));
    montar();
    expect(await screen.findByText('3/1')).toBeTruthy();
  });

  it('nao conta remetente bloqueado', async () => {
    fetchMessages.mockResolvedValue(msgs(3, 'ruim'));
    fetchMyBlocks.mockResolvedValue({ success: true, data: [{ blocked_id: 'ruim' }] });
    montar();
    expect(await screen.findByText('0/1')).toBeTruthy();
  });

  it('falha de leitura nao deixa numero antigo: volta a zero', async () => {
    fetchMessages.mockResolvedValue({ success: false, data: null });
    listarContratos.mockRejectedValue(new Error('falhou'));
    montar();
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByTestId('n').textContent).toBe('0/0');
  });

  it('falha ao ler bloqueios nao mostra mensagens (nao arrisca exibir bloqueado)', async () => {
    fetchMessages.mockResolvedValue(msgs(2));
    fetchMyBlocks.mockResolvedValue({ success: false, data: [] });
    montar();
    expect(await screen.findByText('0/1')).toBeTruthy();
  });

  it('empresa nao recebe aviso de proposta e admin nao recebe nada', async () => {
    fetchMessages.mockResolvedValue(msgs(2));
    usuario = { id: 'eu', type: 'company' };
    const { unmount } = montar();
    expect(await screen.findByText('2/0')).toBeTruthy();
    expect(listarContratos).not.toHaveBeenCalled();
    unmount();
    usuario = { id: 'eu', type: 'admin' };
    fetchMessages.mockClear();
    montar();
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByTestId('n').textContent).toBe('0/0');
    expect(fetchMessages).not.toHaveBeenCalled();
  });

  it('descarta resposta atrasada de conta anterior e zera ao sair', async () => {
    let resolverAntiga: (v: unknown) => void = () => {};
    fetchMessages.mockImplementationOnce(() => new Promise((r) => { resolverAntiga = r; }));
    const { rerender } = montar();
    // sai da conta antes da resposta chegar
    usuario = null;
    rerender(<MemoryRouter><AvisosProvider><Mostra /></AvisosProvider></MemoryRouter>);
    await act(async () => { resolverAntiga(msgs(5)); await Promise.resolve(); await Promise.resolve(); });
    expect(screen.getByTestId('n').textContent).toBe('0/0');
  });

  it('troca de conta zera e le os dados da nova', async () => {
    fetchMessages.mockResolvedValueOnce(msgs(4));
    const { rerender } = montar();
    expect(await screen.findByText('4/1')).toBeTruthy();
    usuario = { id: 'outro', type: 'company' };
    fetchMessages.mockResolvedValueOnce({ success: true, data: [{ sender_id: 'x', receiver_id: 'outro', read: false }] });
    rerender(<MemoryRouter><AvisosProvider><Mostra /></AvisosProvider></MemoryRouter>);
    expect(await screen.findByText('1/0')).toBeTruthy();
  });

  it('nao le em intervalo fixo', async () => {
    vi.useFakeTimers();
    fetchMessages.mockResolvedValue(msgs(1));
    montar();
    await act(async () => { await Promise.resolve(); });
    const antes = fetchMessages.mock.calls.length;
    await act(async () => { vi.advanceTimersByTime(10 * 60 * 1000); });
    expect(fetchMessages.mock.calls.length).toBe(antes);
    vi.useRealTimers();
  });
});
