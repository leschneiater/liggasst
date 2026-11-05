// Gera HTML estatico da capa de artigo do Radar TST (preview dela, 04/11):
// editor do admin com capa atual + pagina do assinante (card e artigo aberto).
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, vi } from 'vitest';
import { writeFileSync, readFileSync, readdirSync, mkdirSync } from 'fs';
import path from 'path';
import RadarAdmin from '../../pages/admin/RadarAdmin';
import RadarTst from '../../pages/RadarTst';

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

vi.mock('../../services/radarAdmin', () => ({
  adminListarRadar: vi.fn().mockResolvedValue({ ok: true, itens: [
    { id: 'p1', titulo: 'NR-1 atualizada: o que muda na pratica', resumo: 'Resumo do artigo', conteudo: 'Conteudo do artigo', status: 'publicado', publicado_em: '2026-11-02T00:00:00Z', updated_at: '2026-11-02T00:00:00Z', capa_path: 'capas/exemplo.jpg' },
  ] }),
  adminCriarRadar: vi.fn(),
  adminEditarRadar: vi.fn(),
  adminDefinirStatusRadar: vi.fn(),
  adminExcluirRadar: vi.fn(),
  adminDefinirCapaRadar: vi.fn(),
  uploadRadarCapa: vi.fn(),
}));

vi.mock('../../services/assinatura', () => ({
  fetchAssinatura: vi.fn().mockResolvedValue({ plan: 'pro_professional', status: 'active', current_period_end: null, environment: 'production' }),
}));
vi.mock('../../services/radarVotos', () => ({
  meuVoto: vi.fn().mockResolvedValue(null),
  votar: vi.fn().mockResolvedValue(undefined),
  resumoVotosAdmin: vi.fn().mockResolvedValue({ p1: { joia: 3, nao_joia: 1 } }),
  proximoVoto: (atual: string | null, clicado: string) => (atual === clicado ? null : clicado),
}));
vi.mock('../../services/radarTst', () => ({
  fetchRadarPosts: vi.fn().mockResolvedValue([
    { id: 'p1', titulo: 'NR-1 atualizada: o que muda na pratica', resumo: 'Entenda os novos prazos do GRO e do PGR para empresas de todos os portes.', publicado_em: '2026-11-02T00:00:00Z', capa_path: 'capas/exemplo.jpg' },
    { id: 'p2', titulo: 'Checklist de SST para pequenas empresas', resumo: 'Um passo a passo simples para manter a conformidade sem complicacao.', publicado_em: '2026-10-28T00:00:00Z', capa_path: null },
  ]),
  fetchRadarPost: vi.fn().mockResolvedValue({ id: 'p1', titulo: 'NR-1 atualizada: o que muda na pratica', resumo: 'Resumo', conteudo: '<h2>Por que a NR-1 mudou</h2><p>Primeiro <strong>paragrafo</strong> do artigo com <em>destaque</em>.</p><h3>O que muda na pratica</h3><p>Segundo paragrafo do artigo.</p><h4>Detalhe fino</h4><ul><li>Item um</li><li>Item dois</li></ul>', publicado_em: '2026-11-02T00:00:00Z', capa_path: 'capas/exemplo.jpg' }),
  radarCapaUrl: (p: string | null) => (p ? `https://cdn.test/${p}` : null),
}));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ currentUser: { id: 'u1', verified: true }, loading: false }),
}));

const css = (() => {
  try {
    const dir = path.join(process.cwd(), 'dist', 'assets');
    const arquivo = readdirSync(dir).find((f) => f.endsWith('.css'));
    return arquivo ? readFileSync(path.join(dir, arquivo), 'utf8') : '';
  } catch { return ''; }
})();

// Imagem local (data URI) no lugar da URL externa, senao o headless fica sem a capa.
const DATA_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#1b5e20"/><text x="600" y="300" fill="#ffffff" font-size="56" font-family="sans-serif" text-anchor="middle">Radar TST</text><text x="600" y="370" fill="#c8e6c9" font-size="34" font-family="sans-serif" text-anchor="middle">capa do artigo 1200 x 630</text></svg>`);

const salvar = (nome: string, html: string) => {
  const corpo = html.replace(/src="(https?:\/\/[^"]*|\/storage\/[^"]*)"/g, `src="${DATA_IMG}"`);
  const doc = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><style>${css}</style></head><body>${corpo}</body></html>`;
  writeFileSync(`/tmp/shots/${nome}.html`, doc);
};

describe('preview visual da capa do Radar TST', () => {
  it('gera HTML do editor do admin com a capa atual', async () => {
    mkdirSync('/tmp/shots', { recursive: true });
    const tela = render(<MemoryRouter><RadarAdmin /></MemoryRouter>);
    const botaoEditar = await tela.findByText('Editar');
    fireEvent.click(botaoEditar);
    await tela.findByText('Remover capa atual');
    salvar('radar-admin-capa', tela.container.innerHTML);
  });

  it('gera HTML da lista de cards, um com capa e outro sem', async () => {
    const tela = render(<MemoryRouter><RadarTst /></MemoryRouter>);
    await tela.findByText('Checklist de SST para pequenas empresas');
    salvar('radar-capa-cards', tela.container.innerHTML);
  });

  it('gera HTML do artigo aberto com capa para o assinante', async () => {
    const tela = render(<MemoryRouter><RadarTst /></MemoryRouter>);
    const card = await tela.findByText('NR-1 atualizada: o que muda na pratica');
    fireEvent.click(card);
    await tela.findByText(/Por que a NR-1 mudou/);
    await tela.findByText('Este artigo foi relevante para você?');
    salvar('radar-capa-artigo', tela.container.innerHTML);
  });

  it('gera HTML do artigo com voto joia ativo', async () => {
    const tela = render(<MemoryRouter><RadarTst /></MemoryRouter>);
    const card = await tela.findByText('NR-1 atualizada: o que muda na pratica');
    fireEvent.click(card);
    const joia = await tela.findByLabelText('Marcar artigo como relevante (joia)');
    fireEvent.click(joia);
    await tela.findByText(/Obrigada! Seu voto ajuda/);
    salvar('radar-artigo-votado', tela.container.innerHTML);
  });

  it('gera HTML da lista do admin com o resumo de votos', async () => {
    const tela = render(<MemoryRouter><RadarAdmin /></MemoryRouter>);
    await tela.findByText('3 joia');
    salvar('radar-admin-votos', tela.container.innerHTML);
  });
});
