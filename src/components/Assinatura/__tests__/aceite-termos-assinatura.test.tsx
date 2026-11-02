// Aceite obrigatorio dos Termos e da Politica antes de abrir o checkout.
// Mock total: nenhum checkout real, nenhuma chamada de rede.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const livre = { plan: 'free', status: 'active', current_period_end: null, environment: 'production' };
const usuario = { id: 'u1', type: 'company', verified: true };
const criarCheckout = vi.fn(async () => ({ url: 'https://exemplo.invalid/checkout' }));
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ currentUser: usuario }),
}));
vi.mock('../../../services/assinatura', () => ({
  fetchAssinatura: vi.fn(async () => livre),
  criarCheckoutTeste: () => criarCheckout(),
  cancelarAssinatura: vi.fn(),
}));
vi.mock('../../../services/reembolsos', () => ({
  solicitarReembolso: vi.fn(),
  fetchMeusPedidosReembolso: vi.fn(async () => []),
  ROTULO_STATUS_REEMBOLSO: {},
}));
import StatusPlano from '../StatusPlano';

describe('aceite dos termos antes de assinar', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.stubEnv('VITE_BILLING_CONTRACT_ENABLED', 'true'); });
  afterEach(() => vi.unstubAllEnvs());

  for (const papel of ['professional', 'company'] as const) {
    it(`(${papel}) botao desabilitado sem marcar, habilita ao marcar, links corretos`, async () => {
      render(<StatusPlano papel={papel} />);
      const botao = (await screen.findByText('Assinar')).closest('button') as HTMLButtonElement;
      const caixa = screen.getByRole('checkbox') as HTMLInputElement;
      expect(caixa.required).toBe(true);
      expect(caixa.checked).toBe(false);
      expect(botao.disabled).toBe(true);
      fireEvent.click(botao);
      expect(criarCheckout).not.toHaveBeenCalled();
      expect(screen.getByTestId('aceite-termos').textContent).toBe('Li e aceito os Termos de Uso e a Política de Privacidade.');
      const termos = screen.getByText('Termos de Uso') as HTMLAnchorElement;
      const pol = screen.getByText('Política de Privacidade') as HTMLAnchorElement;
      expect(termos.getAttribute('href')).toMatch(/termos-de-uso\/$/);
      expect(pol.getAttribute('href')).toMatch(/politica-de-privacidade\/$/);
      expect(termos.target).toBe('_blank');
      expect(termos.rel).toContain('noopener');
      expect(pol.target).toBe('_blank');
      fireEvent.click(caixa);
      expect(botao.disabled).toBe(false);
      fireEvent.click(caixa);
      expect(botao.disabled).toBe(true);
    });
  }

  it('aviso atual da primeira mensalidade segue inalterado', async () => {
    render(<StatusPlano papel="company" />);
    await screen.findByText('Assinar');
    expect(screen.getByTestId('aviso-primeira-cobranca').textContent).toBe(
      'A primeira mensalidade e cobrada no ato da contratacao, sem periodo de teste gratis. Cancele quando quiser, sem multa e sem fidelidade.');
  });
});
