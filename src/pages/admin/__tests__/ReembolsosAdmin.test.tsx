// Teste comportamental da aba admin de reembolsos: lista com valor confirmado,
// aprovar pede confirmacao e chama a decisao; recusar exige motivo.
// Nao executa estorno: a decisao vai para a edge function (mock aqui).
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReembolsosAdmin from '../ReembolsosAdmin';

const adminFetchMock = vi.fn();
const adminDecidirMock = vi.fn();
vi.mock('../../../services/reembolsos', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../../services/reembolsos')>();
  return {
    ...mod,
    adminFetchPedidosReembolso: (...a: unknown[]) => adminFetchMock(...a),
    adminDecidirReembolso: (...a: unknown[]) => adminDecidirMock(...a),
  };
});
vi.mock('../../../services/database', () => ({
  fetchProfileNames: async () => ({ success: true, data: { p1: 'Maria Silva' } }),
}));
vi.mock('../../../components/Layout/AdminAreaNav', () => ({ default: () => null }));

const pedido = {
  id: 'ped-1',
  created_at: '2026-11-02T10:00:00Z',
  profile_id: 'p1',
  asaas_payment_id: 'pay_123',
  valor: 39.9,
  motivo: 'arrependimento em 7 dias',
  status: 'pendente',
  detalhe: null,
  decided_at: null,
  environment: 'sandbox',
  pagamento: { valor: 39.9, status: 'RECEIVED', billingType: 'CREDIT_CARD', paymentDate: '2026-11-01' },
};

describe('ReembolsosAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminFetchMock.mockResolvedValue({ success: true, pedidos: [pedido] });
    adminDecidirMock.mockResolvedValue({ success: true, status: 'estorno_em_andamento' });
    window.confirm = vi.fn(() => true);
  });

  it('lista o pedido com valor confirmado no Asaas e nome do solicitante', async () => {
    render(<ReembolsosAdmin />);
    expect(await screen.findByText('Maria Silva')).toBeTruthy();
    expect(screen.getByText(/R\$\s*39,90/)).toBeTruthy();
    expect(screen.getByText('pay_123')).toBeTruthy();
    // @ts-expect-error dump local para evidencia visual
    (await import('node:fs')).writeFileSync('/tmp/refund-admin.html', document.body.innerHTML);
  });

  it('aprovar pede confirmacao e chama a decisao na function', async () => {
    render(<ReembolsosAdmin />);
    fireEvent.click(await screen.findByText('Aprovar reembolso'));
    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => expect(adminDecidirMock).toHaveBeenCalledWith('ped-1', 'aprovar'));
  });

  it('recusar sem motivo nao chama a decisao; com motivo chama', async () => {
    render(<ReembolsosAdmin />);
    fireEvent.click(await screen.findByText('Recusar'));
    fireEvent.click(screen.getByText('Confirmar recusa'));
    await new Promise(r => setTimeout(r, 50));
    expect(adminDecidirMock).not.toHaveBeenCalled();
    fireEvent.change(screen.getByPlaceholderText('Motivo da recusa (obrigatorio; registre a base concreta)'), { target: { value: 'fora do prazo legal' } });
    fireEvent.click(screen.getByText('Confirmar recusa'));
    await waitFor(() => expect(adminDecidirMock).toHaveBeenCalledWith('ped-1', 'recusar', 'fora do prazo legal'));
  });

  it('pedido decidido aparece no historico, sem botoes de acao', async () => {
    adminFetchMock.mockResolvedValue({
      success: true,
      pedidos: [{ ...pedido, id: 'ped-2', status: 'estornado', detalhe: 'Estorno confirmado pelo Asaas', decided_at: '2026-11-02T11:00:00Z' }],
    });
    render(<ReembolsosAdmin />);
    expect(await screen.findByText('Historico de decisoes')).toBeTruthy();
    expect(screen.getByText('Estorno confirmado pelo Asaas')).toBeTruthy();
    expect(screen.queryByText('Aprovar reembolso')).toBeNull();
    expect(screen.queryByText('Recusar')).toBeNull();
  });

  it('falha de estorno volta para a fila com detalhe em destaque', async () => {
    adminFetchMock.mockResolvedValue({
      success: true,
      pedidos: [{ ...pedido, id: 'ped-3', status: 'erro', detalhe: 'Saldo insuficiente no Asaas para estornar' }],
    });
    render(<ReembolsosAdmin />);
    const det = await screen.findByText('Saldo insuficiente no Asaas para estornar');
    expect(det.closest('p')?.className).toContain('text-red-600');
    expect(screen.getByText('Aprovar reembolso')).toBeTruthy();
  });
});
