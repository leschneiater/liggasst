// Carrossel de anuncios do plano gratuito (decisao dela 04/11):
// so conta free logada ve; assinante pago e visitante nunca veem;
// clique conta via RPC e abre o link em nova aba; rotacao pelo
// intervalo da config do admin.
import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CarrosselAds from '../CarrosselAds';

vi.mock('../../lib/supabase', () => ({
  supabase: { storage: { from: () => ({ getPublicUrl: (p: string) => ({ data: { publicUrl: `https://cdn.test/${p}` } }) }) } },
}));

const bannersAtivosMock = vi.fn();
const configMock = vi.fn();
const cliqueMock = vi.fn();
vi.mock('../../services/ads', async () => {
  const real = await vi.importActual('../../services/ads');
  return {
    ...real,
    fetchBannersAtivos: (...a: unknown[]) => bannersAtivosMock(...a),
    fetchAdsConfig: () => configMock(),
    registrarCliqueAd: (id: string) => cliqueMock(id),
  };
});

let usuario: { id: string } | null = { id: 'u1' };
let free = true;
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: usuario }) }));
vi.mock('../../hooks/usePlanoFree', () => ({ usePlanoFree: () => free }));

const banner = (id: string, titulo: string, link: string | null = 'https://anunciante.example') => ({
  id, titulo, imagem_path: `${id}.png`, link, ordem: 0, ativo: true, cliques: 0,
});

describe('CarrosselAds (plano gratuito)', () => {
  beforeEach(() => {
    usuario = { id: 'u1' };
    free = true;
    bannersAtivosMock.mockReset().mockResolvedValue([banner('b1', 'EPI com desconto')]);
    configMock.mockReset().mockResolvedValue({ intervalo_segundos: 5, max_ativos: 5 });
    cliqueMock.mockReset().mockResolvedValue(undefined);
  });

  it('mostra o banner para conta gratuita logada', async () => {
    render(<CarrosselAds />);
    expect(await screen.findByAltText('EPI com desconto')).toBeInTheDocument();
    expect(screen.getByText('Publicidade')).toBeInTheDocument();
  });

  it('assinante pago NUNCA ve anuncio', async () => {
    free = false;
    const { container } = render(<CarrosselAds />);
    await new Promise((r) => setTimeout(r, 20));
    expect(container).toBeEmptyDOMElement();
    expect(bannersAtivosMock).not.toHaveBeenCalled();
  });

  it('visitante (deslogado) nao ve anuncio', async () => {
    usuario = null;
    free = false;
    const { container } = render(<CarrosselAds />);
    await new Promise((r) => setTimeout(r, 20));
    expect(container).toBeEmptyDOMElement();
  });

  it('clique registra via RPC e abre o link em nova aba', async () => {
    const openMock = vi.fn();
    vi.stubGlobal('open', openMock);
    render(<CarrosselAds />);
    fireEvent.click(await screen.findByRole('button', { name: /EPI com desconto/ }));
    expect(cliqueMock).toHaveBeenCalledWith('b1');
    expect(openMock).toHaveBeenCalledWith('https://anunciante.example', '_blank', 'noopener,noreferrer');
    vi.unstubAllGlobals();
  });

  it('banner sem link conta clique mas nao abre aba', async () => {
    bannersAtivosMock.mockResolvedValue([banner('b2', 'Curso NR-35', null)]);
    const openMock = vi.fn();
    vi.stubGlobal('open', openMock);
    render(<CarrosselAds />);
    fireEvent.click(await screen.findByRole('button', { name: /Curso NR-35/ }));
    expect(cliqueMock).toHaveBeenCalledWith('b2');
    expect(openMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('respeita o maximo de artes da config ao buscar', async () => {
    configMock.mockResolvedValue({ intervalo_segundos: 7, max_ativos: 3 });
    render(<CarrosselAds />);
    await screen.findByAltText('EPI com desconto');
    expect(bannersAtivosMock).toHaveBeenCalledWith(3);
  });

  it('rotaciona entre as artes no intervalo configurado', async () => {
    vi.useFakeTimers();
    bannersAtivosMock.mockResolvedValue([banner('b1', 'Arte Um'), banner('b2', 'Arte Dois')]);
    configMock.mockResolvedValue({ intervalo_segundos: 5, max_ativos: 5 });
    render(<CarrosselAds />);
    await act(async () => {}); // descarrega promises do carregamento
    expect(screen.getByAltText('Arte Um')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(5100); });
    expect(screen.getByAltText('Arte Dois')).toBeInTheDocument();
    vi.useRealTimers();
  });
});
