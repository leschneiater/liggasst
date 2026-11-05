import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PubliqueDemanda from '../../pages/PubliqueDemanda';

const publishMock = vi.fn();
const updateCompanyMock = vi.fn();
const fetchOwnCompanyMock = vi.fn();

vi.mock('../../services/database', () => ({
  publishDemand: (...a: unknown[]) => publishMock(...a),
  updateCompany: (...a: unknown[]) => updateCompanyMock(...a),
  fetchOwnCompany: (...a: unknown[]) => fetchOwnCompanyMock(...a),
}));
const fetchAssinaturaMock = vi.fn();
const demandasAtivasMock = vi.fn();
vi.mock('../../services/assinatura', () => ({
  fetchAssinatura: (...a: unknown[]) => fetchAssinaturaMock(...a),
  fetchDadosFaturamento: vi.fn(async () => null),
  salvarDadosFaturamento: vi.fn(async () => {}),
}));
vi.mock('../../services/limites', () => ({
  demandasAtivasMinhas: (...a: unknown[]) => demandasAtivasMock(...a),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
const authEstavel = { currentUser: { id: 'empresa-1' } };
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => authEstavel,
}));

const empresa = { razao_social: 'Empresa Teste', responsible_name: 'Fulana', responsible_phone: '11999990000' };

const renderPagina = () => render(<MemoryRouter><PubliqueDemanda /></MemoryRouter>);

describe('PubliqueDemanda - rascunho', () => {
  beforeEach(() => {
    publishMock.mockReset().mockResolvedValue({ success: true, data: {} });
    fetchAssinaturaMock.mockReset().mockResolvedValue(null);
    demandasAtivasMock.mockReset().mockResolvedValue(0);
    updateCompanyMock.mockReset().mockResolvedValue({ success: true });
    fetchOwnCompanyMock.mockReset().mockResolvedValue({ success: true, data: empresa });
  });

  it('salvar rascunho exige titulo e descricao e nao grava nada', async () => {
    renderPagina();
    await waitFor(() => expect(fetchOwnCompanyMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /salvar rascunho/i }));
    await new Promise((r) => setTimeout(r, 20));
    expect(publishMock).not.toHaveBeenCalled();
    expect(updateCompanyMock).not.toHaveBeenCalled();
  });

  it('salva rascunho com status draft e NUNCA regrava o cadastro da empresa', async () => {
    renderPagina();
    await waitFor(() => expect(fetchOwnCompanyMock).toHaveBeenCalled());
    fireEvent.change(screen.getByPlaceholderText(/elaboração de pcmso/i), { target: { value: 'Meu rascunho' } });
    fireEvent.change(screen.getByPlaceholderText(/descreva em detalhes/i), { target: { value: 'Texto' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar rascunho/i }));
    await waitFor(() => expect(publishMock).toHaveBeenCalledTimes(1));
    const [dados, status] = publishMock.mock.calls[0];
    expect(status).toBe('draft');
    expect(dados).toMatchObject({ title: 'Meu rascunho', description: 'Texto', service_type: null, deadline: null });
    expect(updateCompanyMock).not.toHaveBeenCalled();
  });

  const preencherEPublicar = async (contato: { empresa?: string }) => {
    const { container } = renderPagina();
    await waitFor(() => expect(fetchOwnCompanyMock).toHaveBeenCalled());
    const campo = (nome: string) => container.querySelector(`[name="${nome}"]`) as HTMLInputElement;
    const set = (nome: string, valor: string) => fireEvent.change(campo(nome), { target: { value: valor } });
    set('titulo', 'T'); set('tipoServico', 'Outro'); set('descricao', 'D'); set('localizacao', 'SP');
    set('estado', 'SP'); set('modalidade', 'remoto'); set('urgencia', 'baixa');
    fireEvent.click(screen.getByRole('button', { name: /próximo/i }));
    set('tipoOrcamento', 'fixo'); set('prazo', '2026-12-01');
    fireEvent.click(screen.getByRole('button', { name: /próximo/i }));
    if (contato.empresa) set('empresa', contato.empresa);
    fireEvent.click(screen.getByRole('button', { name: /publicar demanda/i }));
    await waitFor(() => expect(publishMock).toHaveBeenCalledTimes(1));
  };

  it('publicar com contato inalterado NAO regrava o cadastro e cria demanda ativa', async () => {
    await preencherEPublicar({});
    expect(updateCompanyMock).not.toHaveBeenCalled();
    expect(publishMock.mock.calls[0][1]).toBeUndefined();
  });

  it('publicar com contato alterado regrava somente o campo alterado', async () => {
    await preencherEPublicar({ empresa: 'Outro Nome' });
    expect(updateCompanyMock).toHaveBeenCalledWith('empresa-1', { razao_social: 'Outro Nome' });
  });

  it('empresa free com 3 demandas ativas nao publica e NAO toca no cadastro', async () => {
    demandasAtivasMock.mockResolvedValue(3);
    const { container } = renderPagina();
    await waitFor(() => expect(fetchOwnCompanyMock).toHaveBeenCalled());
    const campo = (nome: string) => container.querySelector(`[name="${nome}"]`) as HTMLInputElement;
    const set = (nome: string, valor: string) => fireEvent.change(campo(nome), { target: { value: valor } });
    set('titulo', 'T'); set('tipoServico', 'Outro'); set('descricao', 'D'); set('localizacao', 'SP');
    set('estado', 'SP'); set('modalidade', 'remoto'); set('urgencia', 'baixa');
    fireEvent.click(screen.getByRole('button', { name: /próximo/i }));
    set('tipoOrcamento', 'fixo'); set('prazo', '2026-12-01');
    fireEvent.click(screen.getByRole('button', { name: /próximo/i }));
    fireEvent.click(screen.getByRole('button', { name: /publicar demanda/i }));
    await waitFor(() => expect(demandasAtivasMock).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 50));
    expect(publishMock).not.toHaveBeenCalled();
    expect(updateCompanyMock).not.toHaveBeenCalled();
  });

  it('empresa pagante publica mesmo com 3 demandas ativas', async () => {
    demandasAtivasMock.mockResolvedValue(3);
    fetchAssinaturaMock.mockResolvedValue({
      plan: 'pro_company', status: 'active', current_period_end: null, environment: 'production',
    });
    await preencherEPublicar({});
    expect(publishMock).toHaveBeenCalledTimes(1);
  });
});
