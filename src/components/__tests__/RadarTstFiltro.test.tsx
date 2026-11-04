import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import RadarTst from '../../pages/RadarTst';
import type { Assinatura } from '../../services/assinatura';

const fetchAssinaturaMock = vi.fn();
vi.mock('../../services/assinatura', () => ({
  fetchAssinatura: (...args: unknown[]) => fetchAssinaturaMock(...args),
}));

const authValue = { currentUser: { id: 'u1', verified: true }, loading: false };
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => authValue,
}));

// Dados de exemplo so para exercitar o filtro — nao sao artigos publicados.
const postsExemplo = [
  {
    id: 'p1',
    titulo: 'Atualização da NR1 sobre riscos psicossociais',
    resumo: 'Entenda o que muda na gestão de riscos.',
    conteudo: 'Conteúdo integral de exemplo da NR1.',
    publicado_em: '2026-10-20',
  },
  {
    id: 'p2',
    titulo: 'Como precificar consultoria em SST',
    resumo: 'Guia prático para TSTs autônomos.',
    conteudo: '...',
    publicado_em: '2026-10-27',
  },
];
const fetchRadarPostsMock = vi.fn();
const fetchRadarPostMock = vi.fn();
vi.mock('../../services/radarTst', () => ({
  fetchRadarPosts: (...args: unknown[]) => fetchRadarPostsMock(...args),
  fetchRadarPost: (...args: unknown[]) => fetchRadarPostMock(...args),
  radarCapaUrl: (p: string | null) => (p ? `https://cdn.test/${p}` : null),
}));

const assinaturaPaga: Assinatura = {
  plan: 'pro_company',
  status: 'active',
  current_period_end: null,
  environment: 'production',
};

// Sem beforeEach com mockClear/mockReset (ver RadarTst.test.tsx): cada teste
// define a propria implementacao do mock.
describe('Radar TST - filtro de pesquisa', () => {
  it('assinante pago ve o campo de pesquisa e a lista completa sem busca', async () => {
    fetchAssinaturaMock.mockResolvedValue(assinaturaPaga);
    fetchRadarPostsMock.mockResolvedValue(postsExemplo);
    render(<MemoryRouter><RadarTst /></MemoryRouter>);
    await waitFor(() =>
      expect(screen.getByLabelText('Pesquisar artigos do Radar TST')).toBeInTheDocument(),
    );
    expect(screen.getByText(/Atualização da NR1/)).toBeInTheDocument();
    expect(screen.getByText(/Como precificar/)).toBeInTheDocument();
  });

  it('filtra por titulo, ignorando acentos e maiusculas', async () => {
    fetchAssinaturaMock.mockResolvedValue(assinaturaPaga);
    fetchRadarPostsMock.mockResolvedValue(postsExemplo);
    render(<MemoryRouter><RadarTst /></MemoryRouter>);
    const campo = await screen.findByLabelText('Pesquisar artigos do Radar TST');
    fireEvent.change(campo, { target: { value: 'ATUALIZACAO' } });
    await waitFor(() => expect(screen.getByText(/Atualização da NR1/)).toBeInTheDocument());
    expect(screen.queryByText(/Como precificar/)).not.toBeInTheDocument();
  });

  it('filtra por resumo', async () => {
    fetchAssinaturaMock.mockResolvedValue(assinaturaPaga);
    fetchRadarPostsMock.mockResolvedValue(postsExemplo);
    render(<MemoryRouter><RadarTst /></MemoryRouter>);
    const campo = await screen.findByLabelText('Pesquisar artigos do Radar TST');
    fireEvent.change(campo, { target: { value: 'autônomos' } });
    await waitFor(() => expect(screen.getByText(/Como precificar/)).toBeInTheDocument());
    expect(screen.queryByText(/Atualização da NR1/)).not.toBeInTheDocument();
  });

  it('abrir um artigo le o conteudo integral e Voltar retorna a lista', async () => {
    fetchAssinaturaMock.mockResolvedValue(assinaturaPaga);
    fetchRadarPostsMock.mockResolvedValue(postsExemplo);
    fetchRadarPostMock.mockImplementation((id: string) =>
      Promise.resolve(postsExemplo.find((p) => p.id === id) ?? null));
    render(<MemoryRouter><RadarTst /></MemoryRouter>);
    const artigo = await screen.findByText(/Atualização da NR1/);
    fireEvent.click(artigo);
    await waitFor(() => expect(screen.getByText(/Conteúdo integral de exemplo/)).toBeInTheDocument());
    expect(fetchRadarPostMock).toHaveBeenCalledWith('p1');
    fireEvent.click(screen.getByText('Voltar para a lista'));
    await waitFor(() => expect(screen.getByText(/Como precificar/)).toBeInTheDocument());
  });

  it('artigo inexistente/bloqueado na leitura integral e fail-closed (erro, sem conteudo)', async () => {
    fetchAssinaturaMock.mockResolvedValue(assinaturaPaga);
    fetchRadarPostsMock.mockResolvedValue(postsExemplo);
    fetchRadarPostMock.mockResolvedValue(null);
    render(<MemoryRouter><RadarTst /></MemoryRouter>);
    const artigo = await screen.findByText(/Atualização da NR1/);
    fireEvent.click(artigo);
    await waitFor(() => expect(screen.getByText(/Não foi possível verificar seu plano/)).toBeInTheDocument());
    expect(screen.queryByText(/Como precificar/)).not.toBeInTheDocument();
  });

  it('busca sem resultado mostra mensagem honesta', async () => {
    fetchAssinaturaMock.mockResolvedValue(assinaturaPaga);
    fetchRadarPostsMock.mockResolvedValue(postsExemplo);
    render(<MemoryRouter><RadarTst /></MemoryRouter>);
    const campo = await screen.findByLabelText('Pesquisar artigos do Radar TST');
    fireEvent.change(campo, { target: { value: 'inexistente' } });
    await waitFor(() =>
      expect(screen.getByText(/Nenhum artigo encontrado para essa pesquisa/)).toBeInTheDocument(),
    );
  });
});
