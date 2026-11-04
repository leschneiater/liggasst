// Acesso as propostas em demandas (tabela public.demand_proposals, migration
// 20261105010000). Mesmo padrao dos demais services: { success, data/error }.
import { supabase } from '../lib/supabase';
import type { PropostaRow, StatusProposta } from '../utils/propostasComparador';

export interface NovaProposta {
  demandId: string;
  amount: number | null;
  deadlineDays: number | null;
  message: string;
}

export type EnviarPropostaResult =
  | { success: true; data: PropostaRow }
  | { success: false; duplicada?: boolean; error: unknown };

export const enviarProposta = async (p: NovaProposta): Promise<EnviarPropostaResult> => {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw userError ?? new Error('Usuário não autenticado');
    const { data, error } = await supabase
      .from('demand_proposals')
      .insert({
        demand_id: p.demandId,
        professional_id: userData.user.id,
        amount: p.amount,
        deadline_days: p.deadlineDays,
        message: p.message.trim(),
      })
      .select()
      .single();
    if (error) {
      // Uma proposta por profissional por demanda (unique no banco).
      if ((error as { code?: string }).code === '23505') {
        return { success: false, duplicada: true, error };
      }
      throw error;
    }
    return { success: true, data: data as PropostaRow };
  } catch (error) {
    console.error('Erro ao enviar proposta:', error);
    return { success: false, error };
  }
};

export const fetchPropostasDaDemanda = async (demandId: string) => {
  try {
    const { data, error } = await supabase
      .from('demand_proposals')
      .select('*')
      .eq('demand_id', demandId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { success: true, data: (data ?? []) as PropostaRow[] };
  } catch (error) {
    console.error('Erro ao buscar propostas da demanda:', error);
    return { success: false, error };
  }
};

// Contagem por demanda para a lista da empresa (uma query, agrupada no cliente).
export const fetchContagemPropostasPorDemanda = async (demandIds: string[]) => {
  try {
    if (demandIds.length === 0) return { success: true, data: {} as Record<string, number> };
    const { data, error } = await supabase
      .from('demand_proposals')
      .select('demand_id')
      .in('demand_id', demandIds);
    if (error) throw error;
    const contagem: Record<string, number> = {};
    for (const row of (data ?? []) as { demand_id: string }[]) {
      contagem[row.demand_id] = (contagem[row.demand_id] ?? 0) + 1;
    }
    return { success: true, data: contagem };
  } catch (error) {
    console.error('Erro ao contar propostas:', error);
    return { success: false, error };
  }
};

export const fetchMinhasPropostas = async () => {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw userError ?? new Error('Usuário não autenticado');
    const { data, error } = await supabase
      .from('demand_proposals')
      .select('*')
      .eq('professional_id', userData.user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { success: true, data: (data ?? []) as PropostaRow[] };
  } catch (error) {
    console.error('Erro ao buscar minhas propostas:', error);
    return { success: false, error };
  }
};

export const atualizarStatusProposta = async (id: string, status: StatusProposta) => {
  try {
    const { data, error } = await supabase
      .from('demand_proposals')
      .update({ status })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      // 0 linhas: proposta saiu do estado permitido (ex.: ja decidida em
      // outra aba) ou nao pertence a conta logada.
      return { success: false, conflict: true, error: new Error('Proposta não está mais disponível para esta ação') };
    }
    return { success: true, data: data as PropostaRow };
  } catch (error) {
    console.error('Erro ao atualizar proposta:', error);
    return { success: false, error };
  }
};
