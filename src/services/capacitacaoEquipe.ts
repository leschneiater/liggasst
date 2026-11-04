// Acesso a capacitacao da equipe (tabelas public.company_employees e
// public.team_training_assignments, migration 20261107010000). Mesmo padrao
// dos demais services: { success, data/error }.
import { supabase } from '../lib/supabase';

export interface FuncionarioEquipe {
  id: string;
  company_id: string;
  employee_profile_id: string | null;
  email: string;
  display_name: string;
  active: boolean;
  invited_at: string;
}

export interface AtribuicaoTreinamento {
  id: string;
  company_employee_id: string;
  training_id: string;
  status: 'assigned' | 'completed';
  assigned_at: string;
  completed_at: string | null;
  trainings?: { id: string; title: string; audience: string; youtube_url: string | null; link_url: string | null; pdf_path: string | null } | null;
}

export const fetchEquipe = async () => {
  try {
    const { data, error } = await supabase
      .from('company_employees')
      .select('id, company_id, employee_profile_id, email, display_name, active, invited_at')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return { success: true, data: (data ?? []) as FuncionarioEquipe[] };
  } catch (error) {
    console.error('Erro ao buscar equipe:', error);
    return { success: false, error, data: [] as FuncionarioEquipe[] };
  }
};

export const adicionarFuncionario = async (email: string, displayName: string) => {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw userError ?? new Error('Usuário não autenticado');
    const { data, error } = await supabase
      .from('company_employees')
      .insert({
        company_id: userData.user.id,
        email: email.trim().toLowerCase(),
        display_name: displayName.trim(),
      })
      .select('id, company_id, employee_profile_id, email, display_name, active, invited_at')
      .single();
    if (error) throw error;
    return { success: true, data: data as FuncionarioEquipe };
  } catch (error) {
    console.error('Erro ao adicionar funcionário:', error);
    return { success: false, error };
  }
};

export const setFuncionarioAtivo = async (id: string, active: boolean) => {
  try {
    const { error } = await supabase
      .from('company_employees')
      .update({ active })
      .eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao atualizar funcionário:', error);
    return { success: false, error };
  }
};

export const removerFuncionario = async (id: string) => {
  try {
    const { error } = await supabase.from('company_employees').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao remover funcionário:', error);
    return { success: false, error };
  }
};

// Visao da empresa: todas as atribuicoes da equipe, com o titulo do
// treinamento embutido (a RLS de trainings libera os publicados).
export const fetchAtribuicoesEquipe = async () => {
  try {
    const { data, error } = await supabase
      .from('team_training_assignments')
      .select('id, company_employee_id, training_id, status, assigned_at, completed_at, trainings (id, title, audience, youtube_url, link_url, pdf_path)')
      .order('assigned_at', { ascending: true });
    if (error) throw error;
    return { success: true, data: (data ?? []) as unknown as AtribuicaoTreinamento[] };
  } catch (error) {
    console.error('Erro ao buscar atribuições:', error);
    return { success: false, error, data: [] as AtribuicaoTreinamento[] };
  }
};

export const atribuirTreinamento = async (companyEmployeeId: string, trainingId: string) => {
  try {
    const { error } = await supabase
      .from('team_training_assignments')
      .insert({ company_employee_id: companyEmployeeId, training_id: trainingId });
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao atribuir treinamento:', error);
    return { success: false, error };
  }
};

export const removerAtribuicao = async (id: string) => {
  try {
    const { error } = await supabase.from('team_training_assignments').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao remover atribuição:', error);
    return { success: false, error };
  }
};

// Visao do funcionario: suas linhas de equipe ativas + atribuicoes.
export const fetchMinhasAtribuicoes = async () => {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw userError ?? new Error('Usuário não autenticado');
    const { data: vinculos, error: vincError } = await supabase
      .from('company_employees')
      .select('id, company_id')
      .eq('employee_profile_id', userData.user.id)
      .eq('active', true);
    if (vincError) throw vincError;
    const linhas = (vinculos ?? []) as { id: string; company_id: string }[];
    if (linhas.length === 0) return { success: true, data: [] as AtribuicaoTreinamento[], vinculos: [] as { id: string; company_id: string }[] };
    const { data, error } = await supabase
      .from('team_training_assignments')
      .select('id, company_employee_id, training_id, status, assigned_at, completed_at, trainings (id, title, audience, youtube_url, link_url, pdf_path)')
      .in('company_employee_id', linhas.map((l) => l.id))
      .order('assigned_at', { ascending: true });
    if (error) throw error;
    return { success: true, data: (data ?? []) as unknown as AtribuicaoTreinamento[], vinculos: linhas };
  } catch (error) {
    console.error('Erro ao buscar meus treinamentos:', error);
    return { success: false, error, data: [] as AtribuicaoTreinamento[], vinculos: [] as { id: string; company_id: string }[] };
  }
};

// Conclusao passa pela RPC: o banco confere vinculo ativo e muda o status.
// O certificado sera emitido nesse ponto quando a infra de certificados entrar.
export const concluirAtribuicao = async (assignmentId: string) => {
  try {
    const { error } = await supabase.rpc('concluir_treinamento_equipe', {
      p_assignment_id: assignmentId,
    });
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao concluir treinamento:', error);
    return { success: false, error };
  }
};
