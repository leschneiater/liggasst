import { describe, it, expect } from 'vitest';
import { linkExternoValido } from '../linkExterno';
import { decidirAcessoPdf } from '../../../supabase/functions/training-file-url/decide';

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

describe('decidirAcessoPdf (logica real da Edge Function)', () => {
  it('membro aprovado no publico recebe acesso', () => {
    expect(decidirAcessoPdf(aprovado('professional'), pub('professional')).ok).toBe(true);
    expect(decidirAcessoPdf(aprovado('company'), pub('both')).ok).toBe(true);
  });
  it('membro NAO aprovado e bloqueado', () => {
    const r = decidirAcessoPdf({ role: 'professional', verification_status: 'pending' }, pub('both'));
    expect(r).toEqual({ ok: false, status: 403, erro: 'conta nao aprovada' });
  });
  it('papel trocado e bloqueado', () => {
    expect(decidirAcessoPdf(aprovado('company'), pub('professional')).ok).toBe(false);
    expect(decidirAcessoPdf(aprovado('professional'), pub('company')).ok).toBe(false);
  });
  it('rascunho (e PDF apos despublicar) bloqueado para membro', () => {
    const rasc = { audience: 'both', status: 'draft', pdf_path: 't.pdf' };
    expect(decidirAcessoPdf(aprovado('professional'), rasc).ok).toBe(false);
    expect(decidirAcessoPdf(aprovado('company'), rasc).ok).toBe(false);
  });
  it('admin acessa inclusive rascunho', () => {
    expect(decidirAcessoPdf(aprovado('admin'), { audience: 'company', status: 'draft', pdf_path: 't.pdf' }).ok).toBe(true);
  });
  it('ID inexistente ou treinamento sem PDF retorna 404', () => {
    expect(decidirAcessoPdf(aprovado('admin'), null)).toEqual({ ok: false, status: 404, erro: 'arquivo nao encontrado' });
    expect(decidirAcessoPdf(aprovado('admin'), { audience: 'both', status: 'published', pdf_path: null }).ok).toBe(false);
  });
  it('perfil ausente e bloqueado', () => {
    expect(decidirAcessoPdf(null, pub('both')).ok).toBe(false);
  });
});
