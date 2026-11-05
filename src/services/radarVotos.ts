// Votos de relevancia do Radar TST (public.radar_votos).
// Um voto por pessoa por artigo, trocavel/removivel a qualquer momento.
// A RLS da tabela garante: voto so da propria conta, so em artigo
// publicado e com acesso pago (regra unica). Contagens sao exclusivas da
// administracao — o assinante ve apenas os botoes, sem placar.
import { supabase } from '../lib/supabase';

export type VotoRadar = 'joia' | 'nao_joia';

export interface ResumoVotos {
  joia: number;
  nao_joia: number;
}

// Toggle puro: clicar no voto atual retira o voto (null); clicar no
// outro troca. Testavel sem banco.
export function proximoVoto(atual: VotoRadar | null, clicado: VotoRadar): VotoRadar | null {
  return atual === clicado ? null : clicado;
}

// Agrega linhas cruas de votos em contagens por artigo (uso do admin,
// que le todas as linhas via RLS).
export function agregaVotos(
  linhas: Array<{ post_id: string; voto: VotoRadar }>,
): Record<string, ResumoVotos> {
  const resumo: Record<string, ResumoVotos> = {};
  for (const l of linhas) {
    if (!resumo[l.post_id]) resumo[l.post_id] = { joia: 0, nao_joia: 0 };
    resumo[l.post_id][l.voto] += 1;
  }
  return resumo;
}

export async function meuVoto(postId: string): Promise<VotoRadar | null> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return null;
  const { data, error } = await supabase
    .from('radar_votos')
    .select('voto')
    .eq('post_id', postId)
    .eq('profile_id', user.user.id)
    .maybeSingle();
  if (error) throw error;
  return (data?.voto ?? null) as VotoRadar | null;
}

// voto === null retira o voto (delete da propria linha).
export async function votar(postId: string, voto: VotoRadar | null): Promise<void> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Sessão expirada. Entre novamente.');
  if (voto === null) {
    const { error } = await supabase
      .from('radar_votos')
      .delete()
      .eq('post_id', postId)
      .eq('profile_id', user.user.id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from('radar_votos')
    .upsert(
      {
        post_id: postId,
        profile_id: user.user.id,
        voto,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'post_id,profile_id' },
    );
  if (error) throw error;
}

// Contagens por artigo para a lista do admin. Depende da policy
// radar_votos_select (admin ve todas as linhas); para nao-admin, a RLS
// devolve so a propria linha e o resumo sai vazio — fail-closed.
export async function resumoVotosAdmin(postIds: string[]): Promise<Record<string, ResumoVotos>> {
  if (postIds.length === 0) return {};
  const { data, error } = await supabase
    .from('radar_votos')
    .select('post_id, voto')
    .in('post_id', postIds);
  if (error) throw error;
  return agregaVotos((data ?? []) as Array<{ post_id: string; voto: VotoRadar }>);
}
