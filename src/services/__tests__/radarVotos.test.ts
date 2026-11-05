import { describe, it, expect, vi } from 'vitest';
import { proximoVoto, agregaVotos } from '../radarVotos';

const { from, authGetUser } = vi.hoisted(() => ({ from: vi.fn(), authGetUser: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: { from, auth: { getUser: authGetUser } } }));

describe('proximoVoto (toggle)', () => {
  it('votar sem voto anterior registra o voto', () => {
    expect(proximoVoto(null, 'joia')).toBe('joia');
    expect(proximoVoto(null, 'nao_joia')).toBe('nao_joia');
  });
  it('clicar no voto atual retira o voto (null)', () => {
    expect(proximoVoto('joia', 'joia')).toBeNull();
    expect(proximoVoto('nao_joia', 'nao_joia')).toBeNull();
  });
  it('clicar no outro botao troca o voto', () => {
    expect(proximoVoto('joia', 'nao_joia')).toBe('nao_joia');
    expect(proximoVoto('nao_joia', 'joia')).toBe('joia');
  });
});

describe('agregaVotos (resumo do admin)', () => {
  it('conta joia e nao_joia por artigo', () => {
    const r = agregaVotos([
      { post_id: 'a', voto: 'joia' },
      { post_id: 'a', voto: 'joia' },
      { post_id: 'a', voto: 'nao_joia' },
      { post_id: 'b', voto: 'nao_joia' },
    ]);
    expect(r['a']).toEqual({ joia: 2, nao_joia: 1 });
    expect(r['b']).toEqual({ joia: 0, nao_joia: 1 });
  });
  it('lista vazia devolve objeto vazio', () => {
    expect(agregaVotos([])).toEqual({});
  });
});
