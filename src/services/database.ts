import { supabase } from '../lib/supabase';

type Filters = Record<string, unknown>;
type ProfileData = Record<string, unknown>;

const getAuthenticatedUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw error ?? new Error('Usuário não autenticado.');
  return data.user;
};

export const fetchProfessionals = async (filters: Filters = {}) => {
  try {
    const { data, error } = await supabase.rpc('search_professionals', {
      p_state: filters.estado ?? filters.state ?? null,
      p_city: filters.cidade ?? filters.city ?? null,
      p_specialization: filters.especializacao ?? filters.specialization ?? null,
    });
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao buscar profissionais:', error);
    return { success: false, error };
  }
};

export interface ProfessionalSearchRow {
  professional_id: string;
  display_name: string | null;
  education: string | null;
  specialization: string | null;
  experience: string | null;
  city: string | null;
  state: string | null;
  hourly_rate: number | null;
  service_radius: string | null;
  description: string | null;
  availability: string[] | null;
  avatar_path: string | null;
}

export interface ProfessionalSearchItem {
  id: string;
  nome: string;
  formacao: string;
  cidade: string;
  estado: string;
  experiencia: number | null;
  valorHora: number | null;
  raioAtendimento: number | null;
  especializacoes: string[];
  disponibilidade: string[];
  descricao: string;
}

const parseLeadingInt = (value: string | null): number | null => {
  if (!value) return null;
  const match = value.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
};

export const mapProfessionalSearchRow = (row: ProfessionalSearchRow): ProfessionalSearchItem => ({
  id: row.professional_id,
  nome: row.display_name || 'Profissional',
  formacao: row.education || '',
  cidade: row.city || '',
  estado: row.state || '',
  experiencia: parseLeadingInt(row.experience),
  valorHora: row.hourly_rate ?? null,
  raioAtendimento: parseLeadingInt(row.service_radius),
  especializacoes: (row.specialization || '')
    .split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0),
  disponibilidade: row.availability ?? [],
  descricao: row.description || ''
});

export const searchProfessionals = async (params: {
  state?: string;
  city?: string;
  specialization?: string;
}): Promise<ProfessionalSearchItem[]> => {
  const { data, error } = await supabase.rpc('search_professionals', {
    p_state: params.state ?? null,
    p_city: params.city ?? null,
    p_specialization: params.specialization ?? null,
  });
  if (error) throw error;
  return ((data ?? []) as ProfessionalSearchRow[]).map(mapProfessionalSearchRow);
};

export const getProfessionalPublic = async (id: string): Promise<ProfessionalSearchItem | null> => {
  const { data, error } = await supabase.rpc('get_professional_public', { p_id: id });
  if (error) throw error;
  const row = ((data ?? []) as ProfessionalSearchRow[])[0];
  return row ? mapProfessionalSearchRow(row) : null;
};

export const fetchCompanies = async (filters: Filters = {}) => {
  try {
    const { data, error } = await supabase.rpc('search_companies', {
      p_state: filters.estado ?? filters.state ?? null,
      p_city: filters.cidade ?? filters.city ?? null,
      p_segment: filters.segmento ?? filters.segment ?? null,
    });
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao buscar empresas:', error);
    return { success: false, error };
  }
};

export const fetchContracts = async () => {
  try {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao buscar contratos:', error);
    return { success: false, error };
  }
};

export const saveUserProfile = async (userId: string, profileData: ProfileData) => {
  try {
    const user = await getAuthenticatedUser();
    if (user.id !== userId) throw new Error('Não é permitido editar outro perfil.');

    const allowedFields = ['display_name', 'phone', 'postal_code', 'city', 'state', 'address', 'avatar_path'];
    const sanitized = Object.fromEntries(
      Object.entries(profileData).filter(([key]) => allowedFields.includes(key))
    );
    const { error } = await supabase.from('profiles').update(sanitized).eq('id', user.id);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao salvar perfil:', error);
    return { success: false, error };
  }
};

export const fetchUserProfile = async (userId: string) => {
  try {
    const user = await getAuthenticatedUser();
    if (user.id !== userId) throw new Error('Não é permitido acessar outro perfil privado.');
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    return { success: false, error };
  }
};


export const fetchOwnCompany = async (profileId: string) => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('profile_id', profileId)
      .maybeSingle();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao buscar empresa:', error);
    return { success: false, error };
  }
};

export const updateCompany = async (profileId: string, companyData: ProfileData) => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .update(companyData)
      .eq('profile_id', profileId)
      .select()
      .single();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao atualizar empresa:', error);
    return { success: false, error };
  }
};

export const sendMessage = async (senderId: string, receiverId: string, content: string) => {
  try {
    const user = await getAuthenticatedUser();
    if (user.id !== senderId) throw new Error('Remetente inválido.');
    const { data, error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: receiverId,
      content,
    }).select().single();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    return { success: false, error };
  }
};

export const fetchMessages = async () => {
  try {
    await getAuthenticatedUser();
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    return { success: false, error };
  }
};

export const markMessageAsRead = async (messageId: string) => {
  try {
    await getAuthenticatedUser();
    const { error } = await supabase.from('messages').update({ read: true }).eq('id', messageId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao marcar mensagem como lida:', error);
    return { success: false, error };
  }
};

// Bloqueio entre usuarios (conversation_blocks)
export const fetchMyBlocks = async () => {
  try {
    const user = await getAuthenticatedUser();
    const { data, error } = await supabase
      .from('conversation_blocks')
      .select('blocked_id')
      .eq('blocker_id', user.id);
    if (error) throw error;
    return { success: true, data: (data || []) as { blocked_id: string }[] };
  } catch (error) {
    console.error('Erro ao buscar bloqueios:', error);
    return { success: false, data: [] as { blocked_id: string }[], error };
  }
};

export const blockUser = async (blockedId: string) => {
  try {
    const user = await getAuthenticatedUser();
    const { error } = await supabase
      .from('conversation_blocks')
      .insert({ blocker_id: user.id, blocked_id: blockedId });
    if (error && error.code !== '23505') throw error; // ignora duplicado
    return { success: true };
  } catch (error) {
    console.error('Erro ao bloquear usuário:', error);
    return { success: false, error };
  }
};

export const unblockUser = async (blockedId: string) => {
  try {
    const user = await getAuthenticatedUser();
    const { error } = await supabase
      .from('conversation_blocks')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', blockedId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao desbloquear usuário:', error);
    return { success: false, error };
  }
};

// Denuncia para a administracao (message_reports)
export const reportUser = async (reportedId: string, reason: string, details: string, messageId?: string) => {
  try {
    const user = await getAuthenticatedUser();
    const { error } = await supabase
      .from('message_reports')
      .insert({
        reporter_id: user.id,
        reported_id: reportedId,
        reason,
        details: details || null,
        message_id: messageId || null
      });
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao registrar denúncia:', error);
    return { success: false, error };
  }
};

// Denuncias - administracao (RLS: so is_admin ve todas e atualiza)
export interface ReportRow {
  id: string;
  reporter_id: string;
  reported_id: string;
  message_id: string | null;
  reason: string;
  details: string | null;
  status: 'open' | 'reviewed' | 'actioned';
  created_at: string;
}

export const fetchReports = async () => {
  try {
    await getAuthenticatedUser();
    const { data, error } = await supabase
      .from('message_reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { success: true, data: (data || []) as ReportRow[] };
  } catch (error) {
    console.error('Erro ao buscar denúncias:', error);
    return { success: false, data: [] as ReportRow[], error };
  }
};

export const updateReportStatus = async (reportId: string, status: 'reviewed' | 'actioned') => {
  try {
    await getAuthenticatedUser();
    const { error } = await supabase
      .from('message_reports')
      .update({ status })
      .eq('id', reportId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao atualizar denúncia:', error);
    return { success: false, error };
  }
};

// Nomes de perfis para a administracao (profiles_select permite is_admin)
export const fetchProfileNames = async (ids: string[]) => {
  try {
    await getAuthenticatedUser();
    if (ids.length === 0) return { success: true, data: {} as Record<string, string> };
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', ids);
    if (error) throw error;
    const mapa: Record<string, string> = {};
    for (const p of (data || []) as { id: string; display_name: string }[]) {
      mapa[p.id] = p.display_name;
    }
    return { success: true, data: mapa };
  } catch (error) {
    console.error('Erro ao buscar nomes:', error);
    return { success: false, data: {} as Record<string, string>, error };
  }
};

export const getProfilePublic = async (id: string) => {
  try {
    await getAuthenticatedUser();
    const { data, error } = await supabase.rpc('get_profile_public', { p_id: id }).maybeSingle();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao buscar perfil público:', error);
    return { success: false, error };
  }
};

export const publishDemand = async (demandData: ProfileData) => {
  try {
    const user = await getAuthenticatedUser();
    const { data, error } = await supabase.from('demands').insert({
      ...demandData,
      company_id: user.id,
      status: 'active',
    }).select().single();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao publicar demanda:', error);
    return { success: false, error };
  }
};

export const fetchDemands = async (filters: Filters = {}) => {
  try {
    let query = supabase.from('demands').select('*');
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') query = query.eq(key, value);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao buscar demandas:', error);
    return { success: false, error };
  }
};
