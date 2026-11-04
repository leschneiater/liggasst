// Cortesia (decisao dela 04/11): quando a assinatura da tabela nao esta
// paga-ativa, fetchAssinatura pergunta o plano efetivo ao banco e devolve
// uma assinatura SINTETICA de assinante pago - sem indicacao de cortesia.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fetchAssinatura } from '../assinatura';
import { assinaturaPagaAtiva } from '../../utils/assinaturaAcesso';

const { from, rpc } = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: { from, rpc } }));
vi.mock('../billingEndpoints', () => ({ funcaoBilling: vi.fn() }));

const selectSub = (row: unknown) => {
  const cadeia = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }), is: vi.fn().mockReturnThis() };
  from.mockReturnValue(cadeia);
  return cadeia;
};

describe('fetchAssinatura com cortesia', () => {
  beforeEach(() => { from.mockReset(); rpc.mockReset(); });

  it('assinatura paga real: nao consulta cortesia', async () => {
    selectSub({ plan: 'pro_company', status: 'active', current_period_end: null, environment: 'production' });
    const a = await fetchAssinatura('u1');
    expect(a?.plan).toBe('pro_company');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('sem assinatura paga + plano efetivo pro: devolve assinante sintetico', async () => {
    selectSub(null);
    rpc.mockResolvedValue({ data: 'pro_professional', error: null });
    const a = await fetchAssinatura('u2');
    expect(a).toMatchObject({ plan: 'pro_professional', status: 'active', environment: 'production' });
    expect(assinaturaPagaAtiva(a)).toBe(true);
  });

  it('cortesia com data fim aparece como "pago ate" a data', async () => {
    const cadeia = selectSub(null);
    rpc.mockResolvedValue({ data: 'pro_company', error: null });
    cadeia.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { valida_ate: '2027-01-31' }, error: null });
    const a = await fetchAssinatura('u3');
    expect(a?.current_period_end).toBe('2027-01-31');
    expect(assinaturaPagaAtiva(a)).toBe(true);
  });

  it('plano efetivo free: devolve a assinatura original', async () => {
    const original = { plan: 'free', status: 'active', current_period_end: null, environment: 'production' };
    selectSub(original);
    rpc.mockResolvedValue({ data: 'free', error: null });
    const a = await fetchAssinatura('u4');
    expect(a?.plan).toBe('free');
    expect(assinaturaPagaAtiva(a)).toBe(false);
  });

  it('erro no plano efetivo: devolve a assinatura original (fail-closed)', async () => {
    selectSub(null);
    rpc.mockResolvedValue({ data: null, error: new Error('x') });
    const a = await fetchAssinatura('u5');
    expect(a).toBeNull();
  });
});
