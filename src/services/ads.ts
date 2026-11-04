export { AD_ARTE_IDEAL, erroProporcaoArte, dimensoesArte } from './adsFormat';
// Carrossel de anuncios do plano gratuito (decisao dela 04/11): banners
// so para conta free logada; admin gerencia artes, link, ordem, ativo,
// tempo por arte e maximo de artes. Clique conta via RPC no servidor.
import { supabase } from '../lib/supabase';

export interface AdBanner {
  id: string;
  titulo: string;
  imagem_path: string;
  link: string | null;
  ordem: number;
  ativo: boolean;
  cliques: number;
}

export interface AdsConfig {
  intervalo_segundos: number;
  max_ativos: number;
}

const BUCKET = 'ads';

export function adImagemUrl(imagemPath: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(imagemPath);
  return data.publicUrl;
}

// Banners ativos para a conta logada. A RLS ja esconde tudo de assinante
// pago e de visitante; aqui so ordenamos e limitamos pela config.
export async function fetchBannersAtivos(maxAtivos: number): Promise<AdBanner[]> {
  const { data, error } = await supabase
    .from('ads_banners')
    .select('id, titulo, imagem_path, link, ordem, ativo, cliques')
    .eq('ativo', true)
    .order('ordem', { ascending: true })
    .limit(maxAtivos);
  if (error) throw error;
  return (data ?? []) as AdBanner[];
}

export async function fetchAdsConfig(): Promise<AdsConfig> {
  const { data, error } = await supabase
    .from('ads_config')
    .select('intervalo_segundos, max_ativos')
    .eq('id', true)
    .single();
  if (error) throw error;
  return data as AdsConfig;
}

export async function registrarCliqueAd(bannerId: string): Promise<void> {
  try {
    await supabase.rpc('registrar_clique_ad', { p_banner_id: bannerId });
  } catch {
    // clique perdido nao quebra a navegacao
  }
}

// ---------------- Admin ----------------

export async function fetchTodosBanners(): Promise<AdBanner[]> {
  const { data, error } = await supabase
    .from('ads_banners')
    .select('id, titulo, imagem_path, link, ordem, ativo, cliques')
    .order('ordem', { ascending: true });
  if (error) throw error;
  return (data ?? []) as AdBanner[];
}

export async function criarBanner(b: Omit<AdBanner, 'id' | 'cliques'>): Promise<void> {
  const { error } = await supabase
    .from('ads_banners')
    .insert({ titulo: b.titulo, imagem_path: b.imagem_path, link: b.link, ordem: b.ordem, ativo: b.ativo });
  if (error) throw error;
}

export async function atualizarBanner(id: string, b: Partial<Omit<AdBanner, 'id' | 'cliques'>>): Promise<void> {
  const { error } = await supabase
    .from('ads_banners')
    .update({ ...b, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function excluirBanner(id: string): Promise<void> {
  const { error } = await supabase.from('ads_banners').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadArteAd(arquivo: File): Promise<string> {
  const ext = arquivo.name.split('.').pop()?.toLowerCase() ?? 'png';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, arquivo, { upsert: false });
  if (error) throw error;
  return path;
}

export async function salvarAdsConfig(cfg: AdsConfig): Promise<void> {
  const { error } = await supabase
    .from('ads_config')
    .update({
      intervalo_segundos: cfg.intervalo_segundos,
      max_ativos: cfg.max_ativos,
      updated_at: new Date().toISOString(),
    })
    .eq('id', true);
  if (error) throw error;
}
