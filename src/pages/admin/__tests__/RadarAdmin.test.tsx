import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RadarAdmin from '../RadarAdmin';

const listar = vi.fn();
const criar = vi.fn();
const status = vi.fn();
const excluir = vi.fn();
const editar = vi.fn();

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../../../services/radarAdmin', () => ({
  adminListarRadar: (...a: unknown[]) => listar(...a),
  adminCriarRadar: (...a: unknown[]) => criar(...a),
  adminEditarRadar: (...a: unknown[]) => editar(...a),
  adminDefinirStatusRadar: (...a: unknown[]) => status(...a),
  adminExcluirRadar: (...a: unknown[]) => excluir(...a),
}));

const post = { id: 'p1', titulo: 'Artigo A', resumo: 'Resumo A', conteudo: 'Conteudo A longo', status: 'rascunho', publicado_em: '2026-11-02T00:00:00Z', updated_at: '2026-11-02T00:00:00Z' };

const abrir = () => render(<MemoryRouter><RadarAdmin /></MemoryRouter>);

describe('RadarAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listar.mockResolvedValue({ ok: true, itens: [post] });
  });

  it('lista artigos com o estado Rascunho', async () => {
    abrir();
    expect(await screen.findByText('Artigo A')).toBeTruthy();
    expect(screen.getByText('Rascunho')).toBeTruthy();
  });

  it('novo artigo e salvo como rascunho', async () => {
    criar.mockResolvedValue(post);
    abrir();
    await screen.findByText('Artigo A');
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Titulo novo' } });
    fireEvent.change(screen.getByLabelText('Resumo'), { target: { value: 'Resumo novo' } });
    fireEvent.change(screen.getByLabelText('Conteúdo'), { target: { value: 'Conteudo novo com texto' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
    await waitFor(() => expect(criar).toHaveBeenCalledWith({ titulo: 'Titulo novo', resumo: 'Resumo novo', conteudo: 'Conteudo novo com texto' }));
    expect(status).not.toHaveBeenCalled();
  });

  it('nao salva com campos curtos', async () => {
    abrir();
    await screen.findByText('Artigo A');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
    expect(criar).not.toHaveBeenCalled();
  });

  it('publicar chama o status publicado', async () => {
    status.mockResolvedValue(true);
    abrir();
    await screen.findByText('Artigo A');
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }));
    await waitFor(() => expect(status).toHaveBeenCalledWith('p1', 'publicado'));
  });

  it('excluir pede confirmacao e nao exclui se negada', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    abrir();
    await screen.findByText('Artigo A');
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(excluir).not.toHaveBeenCalled();
  });
});
