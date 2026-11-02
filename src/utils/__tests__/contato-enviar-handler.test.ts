import { describe, it, expect } from 'vitest';
import { handleContato, LIMITE_POR_EMAIL_HORA, LIMITE_GERAL_HORA, LinhaContato } from '../../../supabase/functions/contato-enviar/handler';

const ok = { nome: 'Ana', email: 'Ana@Exemplo.com', telefone: '', empresa: '', assunto: 'Dúvida', mensagem: 'Preciso de ajuda com a conta.' };
const post = (b: unknown) => new Request('https://f/x', { method: 'POST', body: JSON.stringify(b) });
function mk(opt: { porEmail?: number; total?: number; gravaOk?: boolean } = {}) {
  const gravadas: LinhaContato[] = [];
  return {
    gravadas,
    deps: {
      contarRecentes: async () => ({ porEmail: opt.porEmail ?? 0, total: opt.total ?? 0 }),
      inserir: async (l: LinhaContato) => { if (opt.gravaOk === false) return { ok: false }; gravadas.push(l); return { ok: true }; },
    },
  };
}

describe('contato-enviar', () => {
  it('grava e so entao responde ok; e-mail em minusculas, vazios viram null', async () => {
    const { deps, gravadas } = mk();
    const r = await handleContato(post(ok), deps);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
    expect(gravadas).toHaveLength(1);
    expect(gravadas[0].email).toBe('ana@exemplo.com');
    expect(gravadas[0].telefone).toBeNull();
  });
  it('falha de gravacao nao devolve ok', async () => {
    const r = await handleContato(post(ok), mk({ gravaOk: false }).deps);
    expect(r.status).toBe(500);
    expect((await r.json()).ok).toBeUndefined();
  });
  it('campo-isca preenchido: responde ok sem gravar', async () => {
    const { deps, gravadas } = mk();
    const r = await handleContato(post({ ...ok, site: 'http://spam' }), deps);
    expect(r.status).toBe(200);
    expect(gravadas).toHaveLength(0);
  });
  it.each([
    ['sem nome', { nome: '' }], ['email invalido', { email: 'x' }], ['assunto vazio', { assunto: ' ' }],
    ['mensagem curta', { mensagem: 'oi' }], ['mensagem longa', { mensagem: 'a'.repeat(4001) }],
    ['nome longo', { nome: 'a'.repeat(121) }], ['telefone longo', { telefone: '1'.repeat(31) }],
  ])('rejeita %s com 400 e nao grava', async (_n, extra) => {
    const { deps, gravadas } = mk();
    const r = await handleContato(post({ ...ok, ...extra }), deps);
    expect(r.status).toBe(400);
    expect(gravadas).toHaveLength(0);
  });
  it('limite por e-mail e geral devolvem 429 e nao gravam', async () => {
    for (const o of [{ porEmail: LIMITE_POR_EMAIL_HORA }, { total: LIMITE_GERAL_HORA }]) {
      const { deps, gravadas } = mk(o);
      const r = await handleContato(post(ok), deps);
      expect(r.status).toBe(429);
      expect(gravadas).toHaveLength(0);
    }
  });
  it('metodo errado 405, OPTIONS ok, corpo invalido 400', async () => {
    const { deps } = mk();
    expect((await handleContato(new Request('https://f/x', { method: 'GET' }), deps)).status).toBe(405);
    expect((await handleContato(new Request('https://f/x', { method: 'OPTIONS' }), deps)).status).toBe(200);
    expect((await handleContato(new Request('https://f/x', { method: 'POST', body: 'nao-json' }), deps)).status).toBe(400);
  });
});
