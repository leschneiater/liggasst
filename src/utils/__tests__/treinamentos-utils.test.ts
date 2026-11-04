import { describe, it, expect } from 'vitest';
import { linkExternoValido } from '../linkExterno';
import { assinaturaPagaJanela, decidirAcessoPdf } from '../../../supabase/functions/training-file-url/decide';

describe('linkExternoValido', () => {
  it('aceita http e https', () => {
    expect(linkExternoValido('https://exemplo.com/apostila')).toBe(true);
    expect(linkExternoValido('http://exemplo.com')).toBe(true);
  });
  it('rejeita outros protocolos e lixo', () => {
    expect(linkExternoValido('javascript:alert(1)')).toBe(false);
    expect(linkExternoValido('file:///etc/passwd')).toBe(false);
    expect(linkExternoValido('ftp://exemplo.com')).toBe(false);
    expect(linkExternoValido('nao-e-url')).toBe(false);
    expect(linkExternoValido('')).toBe(false);
  });
});

const aprovado = (role: string) => ({ role, verification_status: 'approved' });
const pub = (audience: string) => ({ audience, status: 'published', pdf_path: 't.pdf' });

// Terceiro parametro: planoPago (gate da Capacitacao, decisao 03/11/2026).
describe('decidirAcessoPdf (logica real da Edge Function)', () => {
  it('membro aprovado, pagante e no publico recebe acesso', () => {
    expect(decidirAcessoPdf(aprovado('professional'), pub('professional'), true).ok).toBe(true);
    expect(decidirAcessoPdf(aprovado('company'), pub('both'), true).ok).toBe(true);
  });
  it('membro GRATUITO e bloqueado mesmo aprovado e no publico', () => {
    const r = decidirAcessoPdf(aprovado('professional'), pub('professional'), false);
    expect(r).toEqual({ ok: false, status: 403, erro: 'conteudo exclusivo para assinantes' });
  });
  it('admin acessa SEM plano pago (gerencia o conteudo)', () => {
    expect(decidirAcessoPdf(aprovado('admin'), pub('company'), false).ok).toBe(true);
  });
  it('membro NAO aprovado e bloqueado', () => {
    const r = decidirAcessoPdf({ role: 'professional', verification_status: 'pending' }, pub('both'), true);
    expect(r).toEqual({ ok: false, status: 403, erro: 'conta nao aprovada' });
  });
  it('papel trocado e bloqueado', () => {
    expect(decidirAcessoPdf(aprovado('company'), pub('professional'), true).ok).toBe(false);
    expect(decidirAcessoPdf(aprovado('professional'), pub('company'), true).ok).toBe(false);
  });
  it('rascunho (e PDF apos despublicar) bloqueado para membro', () => {
    const rasc = { audience: 'both', status: 'draft', pdf_path: 't.pdf' };
    expect(decidirAcessoPdf(aprovado('professional'), rasc, true).ok).toBe(false);
    expect(decidirAcessoPdf(aprovado('company'), rasc, true).ok).toBe(false);
  });
  it('admin acessa inclusive rascunho', () => {
    expect(decidirAcessoPdf(aprovado('admin'), { audience: 'company', status: 'draft', pdf_path: 't.pdf' }, false).ok).toBe(true);
  });
  it('ID inexistente ou treinamento sem PDF retorna 404', () => {
    expect(decidirAcessoPdf(aprovado('admin'), null, false)).toEqual({ ok: false, status: 404, erro: 'arquivo nao encontrado' });
    expect(decidirAcessoPdf(aprovado('admin'), { audience: 'both', status: 'published', pdf_path: null }, false).ok).toBe(false);
  });
  it('perfil ausente e bloqueado', () => {
    expect(decidirAcessoPdf(null, pub('both'), true).ok).toBe(false);
  });
});

describe('assinaturaPagaJanela (mesma janela da RLS de radar_posts)', () => {
  const pro = (extra: Record<string, unknown>) => ({
    plan: 'pro_professional', status: 'active', current_period_end: null, environment: 'production', ...extra,
  });
  it('nega sem registro, plano free e ambiente sandbox', () => {
    expect(assinaturaPagaJanela(null, '2026-11-04')).toBe(false);
    expect(assinaturaPagaJanela(pro({ plan: 'free' }), '2026-11-04')).toBe(false);
    expect(assinaturaPagaJanela(pro({ environment: 'sandbox' }), '2026-11-04')).toBe(false);
  });
  it('permite pro ativo dos dois publicos', () => {
    expect(assinaturaPagaJanela(pro({}), '2026-11-04')).toBe(true);
    expect(assinaturaPagaJanela(pro({ plan: 'pro_company' }), '2026-11-04')).toBe(true);
  });
  it('cancelado/em atraso dentro do periodo acessa; fora dele, nao', () => {
    expect(assinaturaPagaJanela(pro({ status: 'canceled', current_period_end: '2026-11-04' }), '2026-11-04')).toBe(true);
    expect(assinaturaPagaJanela(pro({ status: 'past_due', current_period_end: '2026-11-03' }), '2026-11-04')).toBe(false);
    expect(assinaturaPagaJanela(pro({ status: 'pending_first_payment' }), '2026-11-04')).toBe(false);
  });
});
