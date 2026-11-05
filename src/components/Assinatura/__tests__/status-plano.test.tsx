// Teste de COMPONENTE (nao valida rota do app): renderiza StatusPlano com os
// dados REAIS recuperados do backend de teste (subscriptions do perfil
// allowlisted 596f3628..., projetil LiggaSST producao, plano
// pro_professional/canceled ate 2026-12-02). A rota /assinatura-profissional
// do app exige verification_status != awaiting_completion, o que so muda por
// acao de admin — fora do escopo aprovado.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const assinaturaRealRecuperada = {
  id: 'sub-live-test',
  profile_id: '596f3628-41b5-4b1a-bd62-936b642c934d',
  plan: 'pro_professional',
  status: 'canceled',
  current_period_end: '2026-12-02',
  asaas_customer_id: 'cus_000009788902',
  asaas_subscription_id: 'sub_test',
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z',
};

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    currentUser: {
      id: '596f3628-41b5-4b1a-bd62-936b642c934d',
      type: 'professional',
      verified: true,
      statusVerificacao: 'approved',
      display_name: 'Conta de Teste D1',
    },
  }),
}));

vi.mock('../../../services/assinatura', () => ({
  fetchAssinatura: vi.fn(async () => assinaturaRealRecuperada),
  criarCheckoutTeste: vi.fn(),
  fetchDadosFaturamento: vi.fn(async () => null),
  salvarDadosFaturamento: vi.fn(async () => {}),
}));

vi.mock('../../../services/reembolsos', () => ({
  solicitarReembolso: vi.fn(),
  fetchMeusPedidosReembolso: vi.fn(async () => []),
  ROTULO_STATUS_REEMBOLSO: {},
}));

import StatusPlano from '../StatusPlano';

describe('StatusPlano com dados reais recuperados', () => {
  beforeEach(() => vi.clearAllMocks());

  it('exibe plano pago cancelado com vigencia ate 02/12/2026', async () => {
    render(<StatusPlano papel="professional" />);
    await waitFor(() => {
      expect(screen.getByText(/Assinatura cancelada/)).toBeTruthy();
    });
    expect(screen.getByText(/02\/12\/2026/)).toBeTruthy();
    expect(screen.getByText(/Profissional \(teste\)/)).toBeTruthy();
    // assinatura sem environment=production nunca aparece como real
    expect(screen.getByText(/assinatura de TESTE, sem cobranca real/)).toBeTruthy();
  });
});
