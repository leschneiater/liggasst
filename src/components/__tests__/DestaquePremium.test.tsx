// Destaque pago (pedido dela 04/11): assinante pago aparece PRIMEIRO na busca
// e com selo "Premium" no cartao. O booleano `destaque` vem das RPCs (mesma
// regra unica de acesso pago); a ordenacao escolhida pelo usuario vale
// dentro de cada grupo (premium segue na frente).
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BuscaProfissionais from '../../pages/BuscaProfissionais';
import { mapProfessionalSearchRow } from '../../services/database';

vi.mock('../../lib/supabase', () => ({ supabase: { rpc: vi.fn(), from: vi.fn() } }));

const searchProfessionalsMock = vi.fn();
vi.mock('../../services/database', async () => {
  const real = await vi.importActual('../../services/database');
  return {
    ...real,
    searchProfessionals: (...args: unknown[]) => searchProfessionalsMock(...args),
  };
});
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ currentUser: { id: 'e1' }, userType: 'company', loading: false }),
}));
vi.mock('../../components/CadastroEmpresaModal', () => ({ default: () => null }));

const linha = (id: string, nome: string, destaque: boolean, valorHora: number) => ({
  id, nome, formacao: 'Técnico em SST', cidade: 'São Paulo', estado: 'SP',
  experiencia: 5, valorHora, raioAtendimento: 30, especializacoes: ['PGR'],
  disponibilidade: [], descricao: 'desc', destaque,
});

const nomesNaTela = () =>
  screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);

describe('destaque premium na busca de profissionais', () => {
  beforeEach(() => searchProfessionalsMock.mockReset());

  it('mostra o selo Premium so no cartao de assinante pago', async () => {
    searchProfessionalsMock.mockResolvedValue([
      linha('a', 'Ana Gratuita', false, 80),
      linha('b', 'Bia Premium', true, 120),
    ]);
    render(<MemoryRouter><BuscaProfissionais /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Bia Premium')).toBeInTheDocument());
    expect(screen.getAllByText('Premium')).toHaveLength(1);
  });

  it('assinante pago aparece primeiro, mesmo ordenando por valor', async () => {
    searchProfessionalsMock.mockResolvedValue([
      linha('a', 'Ana Gratuita Barata', false, 50),
      linha('b', 'Bia Premium Cara', true, 200),
    ]);
    render(<MemoryRouter><BuscaProfissionais /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Bia Premium Cara')).toBeInTheDocument());
    expect(nomesNaTela()[0]).toBe('Bia Premium Cara');
    fireEvent.change(screen.getByDisplayValue('Padrão'), { target: { value: 'valor' } });
    expect(nomesNaTela()[0]).toBe('Bia Premium Cara');
  });
});

describe('mapProfessionalSearchRow', () => {
  it('mapeia destaque vindo da RPC e cai para false quando ausente', () => {
    expect(mapProfessionalSearchRow({
      display_name: 'X', education: null, specialization: null, experience: null,
      city: null, state: null, hourly_rate: null, service_radius: null,
      description: null, availability: null, avatar_path: null, linkedin_url: null,
      destaque: true,
    }).destaque).toBe(true);
    expect(mapProfessionalSearchRow({
      display_name: 'Y', education: null, specialization: null, experience: null,
      city: null, state: null, hourly_rate: null, service_radius: null,
      description: null, availability: null, avatar_path: null, linkedin_url: null,
    } as never).destaque).toBe(false);
  });
});
