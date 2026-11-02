// Estado "pending_first_payment" em producao com plano gratuito (reserva de checkout
// sem pagamento): o cartao nao deve dizer "Aguardando o primeiro pagamento".
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const reserva = {
  plan: 'free',
  status: 'pending_first_payment',
  current_period_end: null,
  environment: 'production',
};

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ currentUser: { id: 'u-company', type: 'company', verified: true } }),
}));
vi.mock('../../../services/assinatura', () => ({
  fetchAssinatura: vi.fn(async () => reserva),
  criarCheckoutTeste: vi.fn(),
  cancelarAssinatura: vi.fn(),
}));
vi.mock('../../../services/reembolsos', () => ({
  solicitarReembolso: vi.fn(),
  fetchMeusPedidosReembolso: vi.fn(async () => []),
  ROTULO_STATUS_REEMBOLSO: {},
}));

import StatusPlano from '../StatusPlano';

describe('StatusPlano com reserva de checkout sem pagamento (producao)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mostra contratacao nao concluida e plano gratuito, sem "Aguardando o primeiro pagamento"', async () => {
    render(<StatusPlano papel="company" />);
    await waitFor(() => expect(screen.getByText(/Contratação não concluída/)).toBeTruthy());
    expect(screen.queryByText(/Aguardando o primeiro pagamento/)).toBeNull();
    expect(screen.getByText(/segue no plano gratuito/)).toBeTruthy();
  });
});
