// Teste da tela StatusPlano: o plano exibido vem da tabela (via service),
// nunca de estado local; o botao "Assinar (teste)" so aparece no modo de
// teste E para conta allowlistada; o checkout chamado leva os dados de
// faturamento que o Asaas exige.
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import StatusPlano from '../Assinatura/StatusPlano';

const fetchAssinaturaMock = vi.fn();
const criarCheckoutTesteMock = vi.fn();
vi.mock('../../services/assinatura', () => ({
  fetchAssinatura: (...args: unknown[]) => fetchAssinaturaMock(...args),
  criarCheckoutTeste: (...args: unknown[]) => criarCheckoutTesteMock(...args),
}));

let contaAtual: { id: string } | null = { id: 'u-teste' };
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ currentUser: contaAtual, userType: 'professional', loading: false }),
}));

const solicitarReembolsoMock = vi.fn();
const fetchMeusPedidosMock = vi.fn();
vi.mock('../../services/reembolsos', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../services/reembolsos')>();
  return {
    ...mod,
    solicitarReembolso: (...a: unknown[]) => solicitarReembolsoMock(...a),
    fetchMeusPedidosReembolso: (...a: unknown[]) => fetchMeusPedidosMock(...a),
  };
});

const abrirJanela = vi.fn();
window.open = abrirJanela;

describe('StatusPlano', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contaAtual = { id: 'u-teste' };
    fetchAssinaturaMock.mockResolvedValue({ plan: 'free', status: 'active', current_period_end: null });
    fetchMeusPedidosMock.mockResolvedValue([]);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('mostra o plano gratuito lido da tabela', async () => {
    render(<StatusPlano papel="professional" />);
    expect(await screen.findByText('Plano Gratuito')).toBeTruthy();
    expect(screen.getByText('Voce esta no plano gratuito')).toBeTruthy();
    expect(fetchAssinaturaMock).toHaveBeenCalledWith('u-teste');
  });

  it('mostra plano pago com fim de periodo (veio da tabela, nao de estado local)', async () => {
    fetchAssinaturaMock.mockResolvedValue({ plan: 'pro_professional', status: 'active', current_period_end: '2026-12-02' });
    render(<StatusPlano papel="professional" />);
    expect(await screen.findByText('Plano Profissional (teste)')).toBeTruthy();
    expect(screen.getByText(/Plano pago ativo ate/)).toBeTruthy();
  });

  it('cancelada mostra que o plano continua ate o fim do periodo pago', async () => {
    fetchAssinaturaMock.mockResolvedValue({ plan: 'pro_professional', status: 'canceled', current_period_end: '2026-12-02' });
    render(<StatusPlano papel="professional" />);
    expect(await screen.findByText(/Assinatura cancelada; plano pago continua ate/)).toBeTruthy();
  });

  it('sem modo de teste NAO mostra botao de assinar', async () => {
    vi.stubEnv('VITE_BILLING_TEST_MODE', 'false');
    render(<StatusPlano papel="professional" />);
    await screen.findByText('Plano Gratuito');
    expect(screen.queryByText('Assinar (teste)')).toBeNull();
  });

  it('conta fora da allowlist NAO ve o botao mesmo em modo de teste', async () => {
    vi.stubEnv('VITE_BILLING_TEST_MODE', 'true');
    vi.stubEnv('VITE_BILLING_TEST_ACCOUNTS', 'u-teste');
    contaAtual = { id: 'u-nao-allowlist' };
    fetchAssinaturaMock.mockResolvedValue({ plan: 'free', status: 'active', current_period_end: null });
    fetchMeusPedidosMock.mockResolvedValue([]);
    render(<StatusPlano papel="professional" />);
    await screen.findByText('Plano Gratuito');
    expect(screen.queryByText('Assinar (teste)')).toBeNull();
  });

  it('conta allowlistada em modo de teste ve o botao e abre o checkout', async () => {
    vi.stubEnv('VITE_BILLING_TEST_MODE', 'true');
    vi.stubEnv('VITE_BILLING_TEST_ACCOUNTS', 'u-teste');
    criarCheckoutTesteMock.mockResolvedValue({ url: 'https://sandbox.asaas.com/c/chk_1' });
    render(<StatusPlano papel="professional" />);
    const botao = await screen.findByText('Assinar (teste)');
    fireEvent.change(screen.getByText('Nome completo (faturamento)').nextSibling as Element, { target: { value: 'Conta Teste' } });
    fireEvent.change(screen.getByText('E-mail').nextSibling as Element, { target: { value: 't@example.com' } });
    fireEvent.change(screen.getByText('CPF ou CNPJ').nextSibling as Element, { target: { value: '12345678909' } });
    fireEvent.change(screen.getByText('CEP').nextSibling as Element, { target: { value: '01310100' } });
    fireEvent.change(screen.getByText('Endereco').nextSibling as Element, { target: { value: 'Av. Paulista' } });
    fireEvent.change(screen.getByText('Numero').nextSibling as Element, { target: { value: '1000' } });
    fireEvent.change(screen.getByText('Bairro').nextSibling as Element, { target: { value: 'Bela Vista' } });
    fireEvent.change(screen.getByText('Celular (obrigatorio no Asaas)').nextSibling as Element, { target: { value: '11999990000' } });
    fireEvent.click(botao);
    await waitFor(() => expect(abrirJanela).toHaveBeenCalledWith('https://sandbox.asaas.com/c/chk_1', '_blank', 'noopener'));
    expect(criarCheckoutTesteMock).toHaveBeenCalledWith({
      profileId: 'u-teste',
      papel: 'professional',
      faturamento: {
        nome: 'Conta Teste', email: 't@example.com', cpfCnpj: '12345678909',
        postalCode: '01310100', address: 'Av. Paulista', addressNumber: '1000', province: 'Bela Vista', phone: '11999990000',
      },
    });
  });

  it('falha na leitura cai no gratuito sem quebrar a tela', async () => {
    fetchAssinaturaMock.mockRejectedValue(new Error('rede'));
    render(<StatusPlano papel="professional" />);
    expect(await screen.findByText('Plano Gratuito')).toBeTruthy();
  });
});


describe('StatusPlano - reembolso', () => {
  beforeEach(() => {
    fetchAssinaturaMock.mockResolvedValue({ plan: 'free', status: 'active', current_period_end: null });
    fetchMeusPedidosMock.mockResolvedValue([]);
  });
  const assinaturaPaga = { plan: 'pro_professional', status: 'active', current_period_end: '2026-12-02', last_paid_payment_id: 'pay_123' };

  it('cliente solicita reembolso da ultima cobranca com motivo', async () => {
    fetchAssinaturaMock.mockResolvedValue(assinaturaPaga);
    solicitarReembolsoMock.mockResolvedValue({ success: true });
    render(<StatusPlano papel="professional" />);
    fireEvent.click(await screen.findByText('Solicitar reembolso da ultima cobranca'));
    fireEvent.change(screen.getByPlaceholderText('Motivo do pedido de reembolso'), { target: { value: 'arrependimento' } });
    fireEvent.click(screen.getByText('Enviar pedido'));
    await waitFor(() => expect(solicitarReembolsoMock).toHaveBeenCalledWith('u-teste', 'pay_123', 'arrependimento'));
  });

  it('mostra o estado do pedido existente em vez do botao', async () => {
    fetchAssinaturaMock.mockResolvedValue(assinaturaPaga);
    fetchMeusPedidosMock.mockResolvedValue([{ id: 'ped-1', asaas_payment_id: 'pay_123', status: 'pendente', detalhe: null }]);
    render(<StatusPlano papel="professional" />);
    expect(await screen.findByText(/Reembolso da ultima cobranca:/)).toBeTruthy();
    expect(screen.queryByText('Solicitar reembolso da ultima cobranca')).toBeNull();
  });

  it('plano gratuito nao oferece reembolso', async () => {
    render(<StatusPlano papel="professional" />);
    await screen.findByText('Plano Gratuito');
    expect(screen.queryByText('Solicitar reembolso da ultima cobranca')).toBeNull();
  });

  it('mostra pedidos anteriores de outras cobrancas', async () => {
    fetchAssinaturaMock.mockResolvedValue(assinaturaPaga);
    fetchMeusPedidosMock.mockResolvedValue([
      { id: 'ped-1', asaas_payment_id: 'pay_123', status: 'pendente', detalhe: null },
      { id: 'ped-0', asaas_payment_id: 'pay_999', status: 'recusado', detalhe: 'Fora do prazo legal' },
    ]);
    render(<StatusPlano papel="professional" />);
    expect(await screen.findByText('Pedidos de reembolso anteriores:')).toBeTruthy();
    expect(screen.getByText(/pay_999/)).toBeTruthy();
    expect(screen.getByText(/Fora do prazo legal/)).toBeTruthy();
  });

  it('dump visual dos estados do reembolso', async () => {
    fetchAssinaturaMock.mockResolvedValue(assinaturaPaga);
    const primeiro = render(<StatusPlano papel="professional" />);
    await screen.findByText('Solicitar reembolso da ultima cobranca');
    // @ts-expect-error dump local para evidencia visual
    (await import('node:fs')).writeFileSync('/tmp/refund-status.html', document.body.innerHTML);
    primeiro.unmount();
    fetchMeusPedidosMock.mockResolvedValue([{ id: 'ped-1', asaas_payment_id: 'pay_123', status: 'pendente', detalhe: null }]);
    render(<StatusPlano papel="professional" />);
    await screen.findByText(/Reembolso da ultima cobranca:/);
    // @ts-expect-error dump local para evidencia visual
    (await import('node:fs')).writeFileSync('/tmp/refund-status-pendente.html', document.body.innerHTML);
  });
});
