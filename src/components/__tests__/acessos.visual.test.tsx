// Gera HTML estatico da aba Acessos do admin (preview dela, 04/11).
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, vi } from 'vitest';
import { writeFileSync, readFileSync, readdirSync, mkdirSync } from 'fs';
import path from 'path';
import AcessosAdmin from '../../pages/admin/AcessosAdmin';

vi.mock('../../services/acessos', () => ({
  fetchAcessos: vi.fn().mockResolvedValue([
    { profile_id: 'u1', display_name: 'Maria Silva', email: 'maria@exemplo.com', role: 'professional', plano: 'pro_professional', ultimo_acesso: '2026-11-04', dias_ativos_30d: 3, cortesia_ativa: true },
    { profile_id: 'u2', display_name: 'Padaria Central Ltda', email: 'contato@padaria.com', role: 'company', plano: 'free', ultimo_acesso: '2026-11-02', dias_ativos_30d: 1, cortesia_ativa: false },
    { profile_id: 'u3', display_name: 'Joao Pereira', email: 'joao@exemplo.com', role: 'professional', plano: 'pro_professional', ultimo_acesso: null, dias_ativos_30d: 0, cortesia_ativa: false },
  ]),
  fetchCortesiasAtivas: vi.fn().mockResolvedValue([
    { id: 'c1', profile_id: 'u1', motivo: 'amiga da familia', concedida_por: 'adm', concedida_em: '2026-11-04T12:00:00Z', valida_ate: null, revogada_por: null, revogada_em: null },
  ]),
  concederCortesia: vi.fn(),
  revogarCortesia: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const css = (() => {
  const dir = path.join(process.cwd(), 'dist', 'assets');
  const arquivo = readdirSync(dir).find((f) => f.endsWith('.css'));
  return arquivo ? readFileSync(path.join(dir, arquivo), 'utf8') : '';
})();
const salvar = (nome: string, html: string) => {
  const doc = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><style>${css}</style></head><body>${html}</body></html>`;
  writeFileSync(`/tmp/shots/${nome}.html`, doc);
};

describe('preview visual da aba Acessos', () => {
  it('gera HTML da lista de acessos', async () => {
    mkdirSync('/tmp/shots', { recursive: true });
    const tela = render(<MemoryRouter initialEntries={['/admin/acessos']}><AcessosAdmin /></MemoryRouter>);
    await tela.findByText('Maria Silva');
    salvar('admin-acessos', tela.container.innerHTML);
  });
});
