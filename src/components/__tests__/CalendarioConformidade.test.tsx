// Calendario de conformidade: conta free ve o aviso do plano Empresa sem a
// gestao; conta paga ve resumo + lista ordenada por alerta, e adiciona item.
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CalendarioConformidade from '../../pages/company/CalendarioConformidade';

const fetchItensMock = vi.fn();
const criarItemMock = vi.fn();
const atualizarItemMock = vi.fn();
const excluirItemMock = vi.fn();
const planoPagoMock = vi.fn();

vi.mock('../../services/conformidade', () => ({
  fetchItensConformidade: (...a: unknown[]) => fetchItensMock(...a),
  criarItemConformidade: (...a: unknown[]) => criarItemMock(...a),
  atualizarItemConformidade: (...a: unknown[]) => atualizarItemMock(...a),
  excluirItemConformidade: (...a: unknown[]) => excluirItemMock(...a),
}));
vi.mock('../../hooks/usePlanoPago', () => ({
  usePlanoPago: () => planoPagoMock(),
}));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const hoje = new Date();
const isoDaquiA = (dias: number): string => {
  const d = new Date(hoje);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
};

const itemFixture = {
  id: 'i1', company_id: 'emp-1', titulo: 'PGR da matriz', tipo: 'PGR',
  validade: isoDaquiA(10), responsavel: 'Eng. Segurança', observacoes: null,
  created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z',
};
const itemVencido = {
  ...itemFixture, id: 'i2', titulo: 'PCMSO filial', tipo: 'PCMSO', validade: isoDaquiA(-5),
};

const renderizar = () =>
  render(
    <MemoryRouter initialEntries={['/calendario-conformidade']}>
      <CalendarioConformidade />
    </MemoryRouter>,
  );

describe('CalendarioConformidade', () => {
  beforeEach(() => {
    fetchItensMock.mockReset().mockResolvedValue({ success: true, data: [itemFixture] });
    criarItemMock.mockReset().mockResolvedValue({ success: true, data: itemFixture });
    atualizarItemMock.mockReset().mockResolvedValue({ success: true, data: itemFixture });
    excluirItemMock.mockReset().mockResolvedValue({ success: true });
  });

  it('conta free ve o aviso do plano Empresa, sem resumo, lista ou formulario', async () => {
    planoPagoMock.mockReturnValue(false);
    renderizar();
    await waitFor(() => expect(screen.getByTestId('gate-calendario')).toBeTruthy());
    expect(screen.getByTestId('aviso-limite-calendario')).toBeTruthy();
    expect(screen.getByText(/recurso do plano Empresa/)).toBeTruthy();
    expect(screen.queryByTestId('resumo-conformidade')).toBeNull();
    expect(screen.queryByTestId('lista-conformidade')).toBeNull();
    expect(screen.queryByTestId('form-conformidade')).toBeNull();
    expect(screen.queryByText('PGR da matriz')).toBeNull();
  });

  it('conta paga ve resumo e lista com chip de vencimento', async () => {
    planoPagoMock.mockReturnValue(true);
    renderizar();
    await waitFor(() => expect(screen.getByTestId('lista-conformidade')).toBeTruthy());
    expect(screen.getByTestId('resumo-conformidade')).toBeTruthy();
    expect(screen.getByText('PGR da matriz')).toBeTruthy();
    expect(screen.getByText(/Vence em 10 dias/)).toBeTruthy();
    expect(screen.getByText(/Responsável: Eng. Segurança/)).toBeTruthy();
    expect(screen.queryByTestId('aviso-limite-calendario')).toBeNull();
  });

  it('vencido aparece antes de a vencer na lista', async () => {
    planoPagoMock.mockReturnValue(true);
    fetchItensMock.mockResolvedValue({ success: true, data: [itemFixture, itemVencido] });
    renderizar();
    await waitFor(() => expect(screen.getByTestId('lista-conformidade')).toBeTruthy());
    const lista = screen.getByTestId('lista-conformidade');
    expect(lista.textContent!.indexOf('PCMSO filial')).toBeLessThan(lista.textContent!.indexOf('PGR da matriz'));
    expect(screen.getByText(/Vencido há 5 dias/)).toBeTruthy();
  });

  it('adicionar documento chama o service com os campos do formulario', async () => {
    planoPagoMock.mockReturnValue(true);
    fetchItensMock.mockResolvedValue({ success: true, data: [] });
    renderizar();
    await waitFor(() => expect(screen.getByText(/Nenhum documento registrado/)).toBeTruthy());
    fireEvent.click(screen.getByText('Adicionar documento'));
    fireEvent.change(screen.getByPlaceholderText('Ex.: PGR da matriz'), { target: { value: 'LTCAT 2026' } });
    fireEvent.change(screen.getByDisplayValue('PGR'), { target: { value: 'LTCAT' } });
    const dataInput = document.querySelector('input[type=date]')!;
    fireEvent.change(dataInput, { target: { value: '2027-01-15' } });
    fireEvent.click(screen.getByText('Adicionar'));
    await waitFor(() =>
      expect(criarItemMock).toHaveBeenCalledWith({
        titulo: 'LTCAT 2026',
        tipo: 'LTCAT',
        validade: '2027-01-15',
        responsavel: null,
        observacoes: null,
      }),
    );
  });

  it('item em alerta sugere buscar profissionais com o tipo preenchido; item em dia nao', async () => {
    planoPagoMock.mockReturnValue(true);
    fetchItensMock.mockResolvedValue({
      success: true,
      data: [itemVencido, { ...itemFixture, id: 'i3', titulo: 'ASO anual', validade: isoDaquiA(200) }],
    });
    renderizar();
    await waitFor(() => expect(screen.getByTestId('sugerir-profissionais-i2')).toBeTruthy());
    expect(screen.getByTestId('sugerir-profissionais-i2').closest('a')!.getAttribute('href'))
      .toBe('/busca-profissionais-empresa?q=PCMSO');
    expect(screen.queryByTestId('sugerir-profissionais-i3')).toBeNull();
  });

  it('alterna entre lista, calendario mensal e planner semanal', async () => {
    planoPagoMock.mockReturnValue(true);
    renderizar();
    await waitFor(() => expect(screen.getByTestId('lista-conformidade')).toBeTruthy());
    expect(screen.getByTestId('alternar-visao')).toBeTruthy();

    fireEvent.click(screen.getByText('Calendário'));
    await waitFor(() => expect(screen.getByTestId('visao-mensal')).toBeTruthy());
    expect(screen.queryByTestId('lista-conformidade')).toBeNull();
    // O item vence daqui a 10 dias: o titulo aparece na grade do mes atual.
    expect(screen.getAllByText('PGR da matriz').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText('Planner semanal'));
    await waitFor(() => expect(screen.getByTestId('visao-semanal')).toBeTruthy());
    expect(screen.getByText('Segunda-feira')).toBeTruthy();
    expect(screen.queryByTestId('visao-mensal')).toBeNull();

    fireEvent.click(screen.getByText('Lista'));
    await waitFor(() => expect(screen.getByTestId('lista-conformidade')).toBeTruthy());
    expect(screen.queryByTestId('visao-semanal')).toBeNull();
  });

  it('navegar para o mes do vencimento mostra o item na grade', async () => {
    planoPagoMock.mockReturnValue(true);
    fetchItensMock.mockResolvedValue({
      success: true,
      data: [{ ...itemFixture, validade: isoDaquiA(45) }],
    });
    renderizar();
    await waitFor(() => expect(screen.getByTestId('lista-conformidade')).toBeTruthy());
    fireEvent.click(screen.getByText('Calendário'));
    await waitFor(() => expect(screen.getByTestId('visao-mensal')).toBeTruthy());
    expect(screen.queryByText('PGR da matriz')).toBeNull();
    fireEvent.click(screen.getByLabelText('Próximo mês'));
    await waitFor(() => expect(screen.getByText('PGR da matriz')).toBeTruthy());
  });

  it('excluir pede confirmacao antes de chamar o service', async () => {
    planoPagoMock.mockReturnValue(true);
    renderizar();
    await waitFor(() => expect(screen.getByText('Excluir')).toBeTruthy());
    fireEvent.click(screen.getByText('Excluir'));
    expect(excluirItemMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Confirmar'));
    await waitFor(() => expect(excluirItemMock).toHaveBeenCalledWith('i1'));
  });
});
