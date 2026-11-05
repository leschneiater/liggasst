// Gera HTML estatico da colagem no editor do Radar TST (pedido dela 04/11):
// artigo colado do ChatGPT como markdown/texto puro no celular, renderizado
// no editor do admin e na pagina do assinante, para prova visual.
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, vi } from 'vitest';
import { writeFileSync, readFileSync, readdirSync, mkdirSync } from 'fs';
import path from 'path';
import RadarEditor from '../RadarEditor';
import RadarTst from '../../pages/RadarTst';
import { colagemParaHtml } from '../../services/radarHtml';

// Texto realista colado do app do ChatGPT no Android (markdown + quebras).
const { COLADO } = vi.hoisted(() => ({ COLADO: `# NR-01 e riscos psicossociais: o que muda na prática

A inclusão expressa dos fatores de risco psicossociais relacionados ao trabalho na NR-01 representa uma mudança importante para os profissionais de Segurança e Saúde no Trabalho (SST).

Para o **Técnico de Segurança do Trabalho**, surge um desafio: como identificar, avaliar e propor medidas de prevenção para riscos que nem sempre são *visíveis* durante uma inspeção?

## O que muda na prática

- Mapear os fatores psicossociais no GRO
- Registrar evidências no PGR
- Capacitar as equipes

### Primeiro passo

O primeiro passo é revisar o inventário de riscos com atenção redobrada.` }));

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../../services/assinatura', () => ({
  fetchAssinatura: vi.fn().mockResolvedValue({ plan: 'pro_professional', status: 'active', current_period_end: null, environment: 'production' }),
}));
vi.mock('../../services/radarTst', async () => {
  const { colagemParaHtml: colar } = await import('../../services/radarHtml');
  return {
    fetchRadarPosts: vi.fn().mockResolvedValue([
      { id: 'p1', titulo: 'NR-01 e riscos psicossociais', resumo: 'O que muda na prática.', publicado_em: '2026-11-04T00:00:00Z', capa_path: null },
    ]),
    fetchRadarPost: vi.fn().mockResolvedValue({
      id: 'p1', titulo: 'NR-01 e riscos psicossociais', resumo: 'O que muda na prática.', conteudo: colar({ texto: COLADO }), publicado_em: '2026-11-04T00:00:00Z', capa_path: null,
    }),
    radarCapaUrl: () => null,
  };
});
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

const salvar = (nome: string, html: string) => {
  const doc = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><style>${css}</style></head><body>${html}</body></html>`;
  writeFileSync(`/tmp/shots/${nome}.html`, doc);
};

describe('preview visual da colagem no Radar TST', () => {
  it('gera HTML do editor com o artigo colado (markdown do ChatGPT)', () => {
    mkdirSync('/tmp/shots', { recursive: true });
    const tela = render(
      <RadarEditor id="radar-conteudo" rotulo="Conteúdo" value={colagemParaHtml({ texto: COLADO })} onChange={() => {}} />,
    );
    salvar('radar-colagem-editor', tela.container.innerHTML);
  });

  it('gera HTML do artigo colado aberto para o assinante', async () => {
    const tela = render(<MemoryRouter><RadarTst /></MemoryRouter>);
    const card = await tela.findByText('NR-01 e riscos psicossociais');
    fireEvent.click(card);
    await tela.findByText(/Primeiro passo/);
    salvar('radar-colagem-artigo', tela.container.innerHTML);
  });
});
