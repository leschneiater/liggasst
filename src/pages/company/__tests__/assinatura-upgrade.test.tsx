// Botao de upgrade nos cards de plano (pedido da dona 04/11): com a cobranca
// real ligada (VITE_BILLING_CONTRACT_ENABLED=true) e a conta no plano
// gratuito, o card pago mostra "Assinar o plano ...", que rola ate o
// formulario de contratacao real (StatusPlano). Sem o botao, a pagina nao
// tinha caminho de upgrade visivel.
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AssinaturaEmpresa from '../AssinaturaEmpresa';
import AssinaturaProfissional from '../../professional/AssinaturaProfissional';

const roleAtual: { role: string } = { role: 'company' };
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ currentUser: { id: 'u1', verified: true }, userType: roleAtual.role, loading: false }),
}));
vi.mock('../../../services/assinatura', () => ({
  fetchAssinatura: vi.fn().mockResolvedValue({ plan: 'free', status: 'active', current_period_end: null }),
  criarCheckoutTeste: vi.fn(),
  cancelarAssinatura: vi.fn(),
}));
vi.mock('../../../services/reembolsos', () => ({
  fetchMeusPedidosReembolso: vi.fn().mockResolvedValue([]),
  solicitarReembolso: vi.fn(),
  ROTULO_STATUS_REEMBOLSO: {},
}));

describe('upgrade a partir do plano gratuito', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_BILLING_CONTRACT_ENABLED', 'true');
    Element.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => { vi.unstubAllEnvs(); });

  it('empresa gratuita ve botao de upgrade no card Empresa e ele rola ate a contratacao', async () => {
    roleAtual.role = 'company';
    render(<MemoryRouter><AssinaturaEmpresa /></MemoryRouter>);
    const botao = await screen.findByRole('button', { name: 'Assinar o plano Empresa' });
    // card gratuito segue marcado como atual
    expect(screen.getByRole('button', { name: 'Plano Atual' })).toBeDisabled();
    fireEvent.click(botao);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    // o formulario real de contratacao (StatusPlano) esta na pagina
    expect(screen.getByTestId('status-plano')).toBeInTheDocument();
  });

  it('profissional gratuito ve botao de upgrade no card Profissional', async () => {
    roleAtual.role = 'professional';
    render(<MemoryRouter><AssinaturaProfissional /></MemoryRouter>);
    await screen.findByRole('button', { name: 'Assinar o plano Profissional' });
  });

  it('com a cobranca desligada, o card pago segue "Em breve"', async () => {
    vi.stubEnv('VITE_BILLING_CONTRACT_ENABLED', 'false');
    roleAtual.role = 'company';
    render(<MemoryRouter><AssinaturaEmpresa /></MemoryRouter>);
    const emBreve = await screen.findAllByRole('button', { name: 'Em breve' });
    expect(emBreve.length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Assinar o plano Empresa' })).not.toBeInTheDocument();
  });
});
