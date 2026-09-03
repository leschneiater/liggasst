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
