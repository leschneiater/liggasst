import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import RadarTst from '../../pages/RadarTst';
import { assinaturaPagaAtiva } from '../../utils/assinaturaAcesso';
import type { Assinatura } from '../../services/assinatura';

const fetchAssinaturaMock = vi.fn();
vi.mock('../../services/assinatura', () => ({
  fetchAssinatura: (...args: unknown[]) => fetchAssinaturaMock(...args),
  fetchDadosFaturamento: vi.fn(async () => null),
  salvarDadosFaturamento: vi.fn(async () => {}),
}));

const fetchRadarPostsMock = vi.fn();
vi.mock('../../services/radarVotos', () => ({
  meuVoto: vi.fn().mockResolvedValue(null),
  votar: vi.fn().mockResolvedValue(undefined),
  resumoVotosAdmin: vi.fn().mockResolvedValue({}),
  proximoVoto: (atual: string | null, clicado: string) => (atual === clicado ? null : clicado),
}));
vi.mock('../../services/radarTst', () => ({
  fetchRadarPosts: (...args: unknown[]) => fetchRadarPostsMock(...args),
  radarCapaUrl: (p: string | null) => (p ? `https://cdn.test/${p}` : null),
}));

const authValue = { currentUser: { id: 'u1', verified: true }, loading: false };
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => authValue,
}));

const assinatura = (extra: Partial<Assinatura>): Assinatura => ({
  plan: 'free',
  status: 'active',
  current_period_end: null,
  environment: 'production',
  ...extra,
});

describe('assinaturaPagaAtiva (regra do gate)', () => {
  const hoje = new Date('2026-11-02T12:00:00');
  it('nega sem registro e no plano gratuito', () => {
    expect(assinaturaPagaAtiva(null, hoje)).toBe(false);
    expect(assinaturaPagaAtiva(assinatura({}), hoje)).toBe(false);
  });
  it('permite pro ativo dos dois publicos', () => {
    expect(assinaturaPagaAtiva(assinatura({ plan: 'pro_professional' }), hoje)).toBe(true);
    expect(assinaturaPagaAtiva(assinatura({ plan: 'pro_company' }), hoje)).toBe(true);
  });
  it('cancelado dentro do periodo pago ainda acessa; fora dele, nao', () => {
    expect(assinaturaPagaAtiva(assinatura({ plan: 'pro_professional', status: 'canceled', current_period_end: '2026-11-02' }), hoje)).toBe(true);
    expect(assinaturaPagaAtiva(assinatura({ plan: 'pro_professional', status: 'canceled', current_period_end: '2026-11-01' }), hoje)).toBe(false);
  });
  it('assinatura sandbox NUNCA libera acesso, mesmo pro ativa (isolamento teste/producao)', () => {
    expect(assinaturaPagaAtiva(assinatura({ plan: 'pro_professional', environment: 'sandbox' }), hoje)).toBe(false);
    expect(assinaturaPagaAtiva(assinatura({ plan: 'pro_company', environment: 'sandbox' }), hoje)).toBe(false);
  });
  it('em atraso dentro do periodo acessa; pendente de 1o pagamento nao', () => {
    expect(assinaturaPagaAtiva(assinatura({ plan: 'pro_company', status: 'past_due', current_period_end: '2026-11-10' }), hoje)).toBe(true);
    expect(assinaturaPagaAtiva(assinatura({ plan: 'pro_company', status: 'pending_first_payment' }), hoje)).toBe(false);
  });
});

describe('Pagina Radar TST', () => {
  // Sem reset global no beforeEach: neste setup do vitest, mockClear/mockReset
  // antes do teste faz a rejeicao simulada escapar do catch do componente
  // (verificado empiricamente 02/11). Cada teste define sua implementacao.
  it('plano gratuito ve bloqueio com CTA, sem area de artigos', async () => {
    fetchAssinaturaMock.mockResolvedValue(assinatura({}));
    render(<MemoryRouter><RadarTst /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Conteúdo exclusivo para assinantes')).toBeInTheDocument());
    expect(screen.getByText('Ver planos')).toBeInTheDocument();
    expect(screen.queryByText(/Nenhum artigo publicado/)).not.toBeInTheDocument();
  });

  it('assinante pago ve a area do blog (estado vazio honesto, sem artigo inventado)', async () => {
    fetchAssinaturaMock.mockResolvedValue(assinatura({ plan: 'pro_professional' }));
    fetchRadarPostsMock.mockResolvedValue([]);
    render(<MemoryRouter><RadarTst /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText(/Nenhum artigo publicado ainda/)).toBeInTheDocument());
    expect(screen.queryByText('Conteúdo exclusivo para assinantes')).not.toBeInTheDocument();
  });

  it('assinante pago NAO chama a leitura de artigos antes de o gate liberar; gratuito nunca chama', async () => {
    fetchAssinaturaMock.mockResolvedValue(assinatura({}));
    fetchRadarPostsMock.mockClear();
    render(<MemoryRouter><RadarTst /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Conteúdo exclusivo para assinantes')).toBeInTheDocument());
    expect(fetchRadarPostsMock).not.toHaveBeenCalled();
  });

  it('falha na leitura dos artigos e fail-closed: erro, sem conteudo', async () => {
    fetchAssinaturaMock.mockResolvedValue(assinatura({ plan: 'pro_company' }));
    fetchRadarPostsMock.mockImplementation(() => Promise.reject(new Error('rede')));
    render(<MemoryRouter><RadarTst /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText(/Não foi possível verificar seu plano/)).toBeInTheDocument());
    expect(screen.queryByText(/Nenhum artigo publicado/)).not.toBeInTheDocument();
  });

  it('falha na leitura do plano e fail-closed: erro, sem conteudo e sem CTA de bloqueio', async () => {
    fetchAssinaturaMock.mockImplementation(() => Promise.reject(new Error('rede')));
    render(<MemoryRouter><RadarTst /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText(/Não foi possível verificar seu plano/)).toBeInTheDocument());
    expect(screen.queryByText(/Nenhum artigo publicado/)).not.toBeInTheDocument();
    expect(screen.queryByText('Conteúdo exclusivo para assinantes')).not.toBeInTheDocument();
  });
});
