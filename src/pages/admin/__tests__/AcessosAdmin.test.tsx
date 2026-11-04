// Aba Acessos do admin (decisoes dela 04/11): lista acessos, mostra o selo
// Cortesia, motivo so no detalhe, concede/revoga cortesia.
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import AcessosAdmin from '../AcessosAdmin';
import { concederCortesia, fetchAcessos, fetchCortesiasAtivas, revogarCortesia } from '../../../services/acessos';

vi.mock('../../../services/acessos', () => ({
  fetchAcessos: vi.fn(),
  fetchCortesiasAtivas: vi.fn(),
  concederCortesia: vi.fn(),
  revogarCortesia: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const lista = [
  { profile_id: 'u1', display_name: 'Maria Silva', email: 'maria@teste.local', role: 'professional', plano: 'pro_professional', ultimo_acesso: '2026-11-04', dias_ativos_30d: 3, cortesia_ativa: true },
  { profile_id: 'u2', display_name: 'Padaria Central', email: 'padaria@teste.local', role: 'company', plano: 'free', ultimo_acesso: null, dias_ativos_30d: 0, cortesia_ativa: false },
];
const cort = { id: 'c1', profile_id: 'u1', motivo: 'amiga da familia', concedida_por: 'adm', concedida_em: '2026-11-04T12:00:00Z', valida_ate: null, revogada_por: null, revogada_em: null };

describe('AcessosAdmin', () => {
  beforeEach(() => {
    vi.mocked(fetchAcessos).mockResolvedValue(lista as never);
    vi.mocked(fetchCortesiasAtivas).mockResolvedValue([cort] as never);
  });

  it('lista acessos com plano, dias ativos e selo Cortesia', async () => {
    render(<MemoryRouter><AcessosAdmin /></MemoryRouter>);
    expect(await screen.findByText('Maria Silva')).toBeTruthy();
    expect(screen.getByText('Padaria Central')).toBeTruthy();
    expect(screen.getByText('Cortesia')).toBeTruthy();
    expect(screen.getByText(/Dias ativos \(30d\): 3/)).toBeTruthy();
    expect(screen.getByText(/nenhum desde 04\/11/)).toBeTruthy();
  });

  it('motivo so aparece no detalhe', async () => {
    render(<MemoryRouter><AcessosAdmin /></MemoryRouter>);
    await screen.findByText('Maria Silva');
    expect(screen.queryByText(/amiga da familia/)).toBeNull();
    fireEvent.click(screen.getByText('Ver detalhe'));
    expect(await screen.findByText(/amiga da familia/)).toBeTruthy();
  });

  it('filtra por nome ou e-mail', async () => {
    render(<MemoryRouter><AcessosAdmin /></MemoryRouter>);
    await screen.findByText('Maria Silva');
    fireEvent.change(screen.getByLabelText('Buscar por nome ou e-mail'), { target: { value: 'padaria' } });
    expect(screen.queryByText('Maria Silva')).toBeNull();
    expect(screen.getByText('Padaria Central')).toBeTruthy();
  });

  it('concede cortesia com motivo e data opcional', async () => {
    vi.mocked(concederCortesia).mockResolvedValue(undefined);
    render(<MemoryRouter><AcessosAdmin /></MemoryRouter>);
    await screen.findByText('Padaria Central');
    fireEvent.click(screen.getByText('Dar cortesia'));
    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'parceria' } });
    fireEvent.click(screen.getByText('Conceder'));
    await waitFor(() => expect(concederCortesia).toHaveBeenCalledWith('u2', 'parceria', null));
  });

  it('revoga cortesia apos confirmacao', async () => {
    vi.mocked(revogarCortesia).mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<MemoryRouter><AcessosAdmin /></MemoryRouter>);
    await screen.findByText('Maria Silva');
    fireEvent.click(screen.getByText('Revogar cortesia'));
    await waitFor(() => expect(revogarCortesia).toHaveBeenCalledWith('c1'));
  });
});
