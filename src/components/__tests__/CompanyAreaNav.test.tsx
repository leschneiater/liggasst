import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import Layout from '../Layout/Layout';
import { companyAreaPaths } from '../Layout/companyMenu';
import { professionalAreaPaths } from '../Layout/ProfessionalAreaNav';

// jsdom nao implementa scrollIntoView (usado para manter o item ativo visivel)
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});

let mensagensDisponivel = true;
vi.mock('../../hooks/useMessagingDisponivel', () => ({
  useMessagingDisponivel: () => ({ disponivel: mensagensDisponivel }),
}));

vi.mock('../Layout/Header', () => ({ default: () => <div data-testid="header" /> }));
vi.mock('../Layout/Footer', () => ({ default: () => <div data-testid="footer" /> }));

describe('Menu fixo da area empresa', () => {
  it('aparece nas telas da empresa, com sticky e links reais', () => {
    mensagensDisponivel = true;
    render(
      <MemoryRouter initialEntries={['/dashboard-empresa']}>
        <Layout><div>conteúdo</div></Layout>
      </MemoryRouter>
    );
    const nav = screen.getByLabelText('Menu da empresa');
    expect(nav.className).toContain('sticky');
    expect(nav.className).toContain('top-16');
    for (const label of ['Painel', 'Buscar Profissionais', 'Mensagens', 'Contratos', 'Relatórios', 'Treinamentos', 'Perfil', 'Assinatura']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText('Painel').closest('a')).toHaveAttribute('aria-current', 'page');
  });

  it('esconde Mensagens quando o canal nao esta disponivel', () => {
    mensagensDisponivel = false;
    render(
      <MemoryRouter initialEntries={['/dashboard-empresa']}>
        <Layout><div>conteúdo</div></Layout>
      </MemoryRouter>
    );
    expect(screen.queryByText('Mensagens')).not.toBeInTheDocument();
    mensagensDisponivel = true;
  });

  it('nao aparece fora da area empresa nem duplica o menu profissional', () => {
    render(
      <MemoryRouter initialEntries={['/planos']}>
        <Layout><div>conteúdo</div></Layout>
      </MemoryRouter>
    );
    expect(screen.queryByLabelText('Menu da empresa')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Menu do profissional')).not.toBeInTheDocument();
  });

  it('rotas do menu empresa existem e nao se sobrepoem as do profissional', () => {
    const esperado = [
      '/dashboard-empresa', '/busca-profissionais-empresa', '/mensagens-empresa',
      '/contratos-empresa', '/relatorios', '/treinamentos-empresa',
      '/perfil-empresa', '/assinatura-empresa',
    ];
    expect([...companyAreaPaths].sort()).toEqual([...esperado].sort());
    expect(companyAreaPaths.filter((p) => professionalAreaPaths.includes(p))).toEqual([]);
  });
});
