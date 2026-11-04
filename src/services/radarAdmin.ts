// Gestao dos artigos do Radar TST pela admin. A protecao real e a RLS de
// radar_posts (escrita e leitura de rascunhos so para admin).
import { supabase } from '../lib/supabase';

export type StatusRadar = 'rascunho' | 'publicado';
export interface RadarAdminPost {
  id: string; titulo: string; resumo: string; conteudo: string;
  capa_path: string | null;
  status: StatusRadar; publicado_em: string; updated_at: string;
}
export interface RadarAdminCampos { titulo: string; resumo: string; conteudo: string }

const COLS = 'id, titulo, resumo, conteudo, capa_path, status, publicado_em, updated_at';

export async function adminListarRadar(): Promise<{ ok: boolean; itens: RadarAdminPost[] }> {
  const { data, error } = await supabase.from('radar_posts').select(COLS).order('updated_at', { ascending: false }).limit(200);
  return error ? { ok: false, itens: [] } : { ok: true, itens: (data ?? []) as RadarAdminPost[] };
}
export async function adminCriarRadar(c: RadarAdminCampos): Promise<RadarAdminPost | null> {
  const { data, error } = await supabase.from('radar_posts')
    .insert({ titulo: c.titulo, resumo: c.resumo, conteudo: c.conteudo, status: 'rascunho' }).select(COLS).single();
  return error ? null : (data as RadarAdminPost);
}
export async function adminEditarRadar(id: string, c: RadarAdminCampos): Promise<boolean> {
  const { error } = await supabase.from('radar_posts')
    .update({ titulo: c.titulo, resumo: c.resumo, conteudo: c.conteudo, updated_at: new Date().toISOString() }).eq('id', id);
  return !error;
}
export async function adminDefinirStatusRadar(id: string, status: StatusRadar): Promise<boolean> {
  const agora = new Date().toISOString();
  const campos = status === 'publicado' ? { status, publicado_em: agora, updated_at: agora } : { status, updated_at: agora };
  const { error } = await supabase.from('radar_posts').update(campos).eq('id', id);
  return !error;
}
export async function adminExcluirRadar(id: string): Promise<boolean> {
  const { error } = await supabase.from('radar_posts').delete().eq('id', id);
  return !error;
}

// Upload da capa (bucket radar-covers, escrita so admin; pedido dela 04/11).
export async function uploadRadarCapa(arquivo: File): Promise<string> {
  const ext = arquivo.name.split('.').pop()?.toLowerCase() ?? 'png';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('radar-covers').upload(path, arquivo, { upsert: false });
  if (error) throw error;
  return path;
}

// Definir/remover a capa de um artigo.
export async function adminDefinirCapaRadar(id: string, capaPath: string | null): Promise<boolean> {
  const { error } = await supabase.from('radar_posts')
    .update({ capa_path: capaPath, updated_at: new Date().toISOString() }).eq('id', id);
  return !error;
}
