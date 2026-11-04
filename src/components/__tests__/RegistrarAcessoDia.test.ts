// Ordenacao premium por frequencia de acesso (Opcao A aprovada 04/11):
// o app grava 1 linha/dia em public.acesso_diario; as buscas ordenam por
// dias ativos (30d) dentro do grupo premium. Falha nunca quebra o login.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registrarAcessoDia } from '../../services/database';

const upsertMock = vi.fn();
const fromMock = vi.fn((t: string) => { void t; return { upsert: upsertMock }; });
vi.mock('../../lib/supabase', () => ({ supabase: { from: (t: string) => fromMock(t) } }));

describe('registrarAcessoDia', () => {
  beforeEach(() => {
    fromMock.mockClear();
    upsertMock.mockReset().mockResolvedValue({ error: null });
  });

  it('grava 1 linha por dia com a data local yyyy-mm-dd', async () => {
    await registrarAcessoDia('user-1');
    expect(fromMock).toHaveBeenCalledWith('acesso_diario');
    expect(upsertMock).toHaveBeenCalledWith(
      { user_id: 'user-1', dia: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) },
      { onConflict: 'user_id,dia', ignoreDuplicates: true },
    );
  });

  it('nao quebra o login se o upsert falhar', async () => {
    upsertMock.mockResolvedValueOnce({ error: { message: 'rls' } });
    await expect(registrarAcessoDia('user-1')).resolves.toBeUndefined();
    upsertMock.mockRejectedValueOnce(new Error('rede'));
    await expect(registrarAcessoDia('user-1')).resolves.toBeUndefined();
  });
});
