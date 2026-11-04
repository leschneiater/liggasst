// Acesso ao calendario de conformidade (tabela public.compliance_items,
// migration 20261106010000). Mesmo padrao dos demais services:
// { success, data/error }.
import { supabase } from '../lib/supabase';
import type { ItemConformidade } from '../utils/calendarioConformidade';

export interface NovoItemConformidade {
  titulo: string;
  tipo: string;
  validade: string; // date ISO (yyyy-mm-dd)
  responsavel: string | null;
  observacoes: string | null;
}

export const fetchItensConformidade = async () => {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw userError ?? new Error('Usuário não autenticado');
    const { data, error } = await supabase
      .from('compliance_items')
      .select('*')
      .eq('company_id', userData.user.id)
      .order('validade', { ascending: true });
    if (error) throw error;
    return { success: true, data: (data ?? []) as ItemConformidade[] };
  } catch (error) {
    console.error('Erro ao buscar itens de conformidade:', error);
    return { success: false, error };
  }
};

export const criarItemConformidade = async (item: NovoItemConformidade) => {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw userError ?? new Error('Usuário não autenticado');
    const { data, error } = await supabase
      .from('compliance_items')
      .insert({
        company_id: userData.user.id,
        titulo: item.titulo.trim(),
        tipo: item.tipo,
        validade: item.validade,
        responsavel: item.responsavel?.trim() || null,
        observacoes: item.observacoes?.trim() || null,
      })
      .select()
      .single();
    if (error) throw error;
    return { success: true, data: data as ItemConformidade };
  } catch (error) {
    console.error('Erro ao criar item de conformidade:', error);
    return { success: false, error };
  }
};

export const atualizarItemConformidade = async (id: string, item: NovoItemConformidade) => {
  try {
    const { data, error } = await supabase
      .from('compliance_items')
      .update({
        titulo: item.titulo.trim(),
        tipo: item.tipo,
        validade: item.validade,
        responsavel: item.responsavel?.trim() || null,
        observacoes: item.observacoes?.trim() || null,
      })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      // 0 linhas: item nao existe mais ou nao pertence a conta logada.
      return { success: false, conflict: true, error: new Error('Item não está mais disponível para edição') };
    }
    return { success: true, data: data as ItemConformidade };
  } catch (error) {
    console.error('Erro ao atualizar item de conformidade:', error);
    return { success: false, error };
  }
};

export const excluirItemConformidade = async (id: string) => {
  try {
    const { data, error } = await supabase
      .from('compliance_items')
      .delete()
      .eq('id', id)
      .select('id');
    if (error) throw error;
    if (!data || data.length === 0) {
      return { success: false, conflict: true, error: new Error('Item não está mais disponível para exclusão') };
    }
    return { success: true };
  } catch (error) {
    console.error('Erro ao excluir item de conformidade:', error);
    return { success: false, error };
  }
};
