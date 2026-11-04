// Gera HTML estatico do carrossel de anuncios (visao de conta free) e do
// painel admin de Publicidade, para screenshots de evidencia (preview dela).
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, vi } from 'vitest';
import { writeFileSync, readFileSync, readdirSync, mkdirSync } from 'fs';
import path from 'path';
import CarrosselAds from '../CarrosselAds';
import AdsAdmin from '../../pages/admin/AdsAdmin';

vi.mock('../../lib/supabase', () => ({
  supabase: { storage: { from: () => ({ getPublicUrl: (p: string) => ({ data: { publicUrl: `https://cdn.test/${p}` } }) }) } },
}));

const banners = vi.hoisted(() => [
  { id: 'b1', titulo: 'EPIs com 20% de desconto', imagem_path: 'arte-epi.png', link: 'https://anunciante.example/epi', ordem: 1, ativo: true, cliques: 12 },
  { id: 'b2', titulo: 'Curso online NR-35', imagem_path: 'arte-nr35.png', link: null, ordem: 2, ativo: true, cliques: 3 },
  { id: 'b3', titulo: 'Consultoria de PGR (inativo)', imagem_path: 'arte-pgr.png', link: 'https://anunciante.example/pgr', ordem: 3, ativo: false, cliques: 0 },
]);

vi.mock('../../services/ads', async () => {
  const real = await vi.importActual('../../services/ads');
  return {
    ...real,
    fetchAdsConfig: vi.fn().mockResolvedValue({ intervalo_segundos: 5, max_ativos: 5 }),
    fetchBannersAtivos: vi.fn().mockResolvedValue(banners.filter((b) => b.ativo)),
    fetchTodosBanners: vi.fn().mockResolvedValue(banners),
    registrarCliqueAd: vi.fn(),
  };
});
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { id: 'u1' } }) }));
vi.mock('../../hooks/usePlanoFree', () => ({ usePlanoFree: () => true }));

const css = (() => {
  try {
    const dir = path.resolve(__dirname, '../../../dist/assets');
    const file = readdirSync(dir).find((f) => f.endsWith('.css'));
    return file ? readFileSync(path.join(dir, file), 'utf8') : '';
  } catch { return ''; }
})();

const salvar = (nome: string, html: string) => {
  const doc = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><style>${css}</style></head><body>${html}</body></html>`;
  writeFileSync(`/tmp/shots/${nome}.html`, doc);
};

describe('snapshots visuais - anuncios', () => {
  it('gera HTMLs', async () => {
    mkdirSync('/tmp/shots', { recursive: true });

    // Visao da conta free: carrossel dentro do painel (largura de conteudo).
    const livre = render(
      <MemoryRouter>
        <div className="min-h-screen bg-neutral-gray py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <CarrosselAds />
          </div>
        </div>
      </MemoryRouter>
    );
    await livre.findByAltText('EPIs com 20% de desconto');
    salvar('carrossel-ads-conta-gratuita', livre.container.innerHTML);

    const admin = render(<MemoryRouter initialEntries={['/admin/publicidade']}><AdsAdmin /></MemoryRouter>);
    await admin.findByText('EPIs com 20% de desconto');
    salvar('admin-publicidade', admin.container.innerHTML);
  });
});
