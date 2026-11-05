import { describe, it, expect, vi } from 'vitest';
import { statusRadarLista, adminAgendarRadar } from '../radarAdmin';

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: { from } }));

describe('statusRadarLista (estado derivado da lista do admin)', () => {
  const ref = new Date('2026-11-05T12:00:00-03:00');
  it('rascunho continua rascunho mesmo com data futura', () => {
    expect(statusRadarLista({ status: 'rascunho', publicado_em: '2027-01-01T12:00:00Z' }, ref)).toBe('rascunho');
  });
  it('publicado com publicado_em futuro e agendado', () => {
    expect(statusRadarLista({ status: 'publicado', publicado_em: '2026-11-06T12:00:00Z' }, ref)).toBe('agendado');
  });
  it('publicado com publicado_em passado e publicado', () => {
    expect(statusRadarLista({ status: 'publicado', publicado_em: '2026-11-04T12:00:00Z' }, ref)).toBe('publicado');
  });
});

describe('adminAgendarRadar', () => {
  it('grava status publicado com o publicado_em escolhido (sem cron)', async () => {
    const cadeia = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ error: null }) };
    from.mockReturnValue(cadeia);
    const quando = new Date('2026-11-10T08:30:00-03:00');
    const ok = await adminAgendarRadar('p1', quando);
    expect(ok).toBe(true);
    expect(from).toHaveBeenCalledWith('radar_posts');
    expect(cadeia.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'publicado',
      publicado_em: quando.toISOString(),
    }));
    expect(cadeia.eq).toHaveBeenCalledWith('id', 'p1');
  });
});
