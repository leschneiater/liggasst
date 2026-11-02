// Leitura dos artigos do Radar TST (public.radar_posts).
// A RLS da tabela e a protecao real: so devolve linhas para assinante pago
// ativo (mesma regra de assinaturaPagaAtiva, aplicada no banco). Para
// qualquer outra conta, a query retorna lista vazia — fail-closed.
// Nada de artigo no bundle do frontend.
import { supabase } from '../lib/supabase';

export interface RadarTstPost {
  id: string;
  titulo: string;
  resumo: string;
  conteudo: string;
  publicado_em: string; // timestamptz ISO
}

export type RadarTstResumo = Omit<RadarTstPost, 'conteudo'>;

// Lista SEM o conteudo integral: o corpo so e lido artigo a artigo.
export async function fetchRadarPosts(): Promise<RadarTstResumo[]> {
  const { data, error } = await supabase
    .from('radar_posts')
    .select('id, titulo, resumo, publicado_em')
    .order('publicado_em', { ascending: false });
  if (error) throw error;
  return (data ?? []) as RadarTstResumo[];
}

// Leitura do artigo completo. A mesma RLS protege esta query: sem
// assinatura paga de producao, retorna zero linhas (null) — fail-closed.
export async function fetchRadarPost(id: string): Promise<RadarTstPost | null> {
  const { data, error } = await supabase
    .from('radar_posts')
    .select('id, titulo, resumo, conteudo, publicado_em')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as RadarTstPost | null;
}
