// Aba admin "Acessos" + cortesia (decisoes dela 04/11): lista de acessos
// (ultimo acesso, dias ativos 30d, plano, selo Cortesia) e conceder/revogar
// cortesia. Tudo via RPCs admin-only (security definer + is_admin no banco).
import { supabase } from '../lib/supabase';

export interface AcessoRow {
  profile_id: string;
  display_name: string;
  email: string;
  role: string;
  plano: 'free' | 'pro_professional' | 'pro_company';
  ultimo_acesso: string | null;
  dias_ativos_30d: number;
  cortesia_ativa: boolean;
}

export interface CortesiaRow {
  id: string;
  profile_id: string;
  motivo: string;
  concedida_por: string;
  concedida_em: string;
  valida_ate: string | null;
  revogada_por: string | null;
  revogada_em: string | null;
}

export async function fetchAcessos(): Promise<AcessoRow[]> {
  const { data, error } = await supabase.rpc('admin_listar_acessos');
  if (error) throw error;
  return (data ?? []) as AcessoRow[];
}

export async function fetchCortesiasAtivas(): Promise<CortesiaRow[]> {
  const { data, error } = await supabase
    .from('cortesias')
    .select('id, profile_id, motivo, concedida_por, concedida_em, valida_ate, revogada_por, revogada_em')
    .is('revogada_em', null);
  if (error) throw error;
  return (data ?? []) as CortesiaRow[];
}

export async function concederCortesia(profileId: string, motivo: string, validaAte: string | null): Promise<void> {
  const { error } = await supabase.rpc('admin_conceder_cortesia', {
    p_profile: profileId,
    p_motivo: motivo,
    p_valida_ate: validaAte,
  });
  if (error) throw error;
}

export async function revogarCortesia(cortesiaId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_revogar_cortesia', { p_cortesia: cortesiaId });
  if (error) throw error;
}
