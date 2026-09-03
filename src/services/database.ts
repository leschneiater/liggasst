import { supabase } from '../lib/supabase';

// Função para buscar profissionais
export const fetchProfessionals = async (filters = {}) => {
  try {
    let query = supabase.from('professionals').select('*');
    
    // Aplicar filtros se existirem
    if (Object.keys(filters).length > 0) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          if (Array.isArray(value)) {
            query = query.contains(key, value);
          } else if (typeof value === 'string' && value.includes(',')) {
            // Para filtros com múltiplos valores separados por vírgula
            query = query.in(key, value.split(','));
          } else {
            query = query.eq(key, value);
          }
        }
      });
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao buscar profissionais:', error);
    return { success: false, error };
  }
};

// Função para buscar empresas
export const fetchCompanies = async (filters = {}) => {
  try {
    let query = supabase.from('companies').select('*');
    
    // Aplicar filtros se existirem
    if (Object.keys(filters).length > 0) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          if (Array.isArray(value)) {
            query = query.contains(key, value);
          } else if (typeof value === 'string' && value.includes(',')) {
            query = query.in(key, value.split(','));
          } else {
            query = query.eq(key, value);
          }
        }
      });
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao buscar empresas:', error);
    return { success: false, error };
  }
};

// Função para buscar contratos
export const fetchContracts = async (userId, userType) => {
  try {
    let query = supabase.from('contracts').select('*');
    
    // Filtrar por usuário (profissional ou empresa)
    if (userType === 'professional') {
      query = query.eq('professional_id', userId);
    } else if (userType === 'company') {
      query = query.eq('company_id', userId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao buscar contratos:', error);
    return { success: false, error };
  }
};

// Função para salvar perfil do usuário
export const saveUserProfile = async (userId, profileData) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        ...profileData,
        updated_at: new Date().toISOString(),
      });
    
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Erro ao salvar perfil:', error);
    return { success: false, error };
  }
};

// Função para buscar perfil do usuário
export const fetchUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    return { success: false, error };
  }
};

// Função para enviar mensagem
export const sendMessage = async (senderId, receiverId, content) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        content,
        created_at: new Date().toISOString(),
        read: false
      });
    
    if (error) throw error;
    
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    return { success: false, error };
  }
};

// Função para buscar mensagens
export const fetchMessages = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    return { success: false, error };
  }
};

// Função para marcar mensagem como lida
export const markMessageAsRead = async (messageId) => {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('id', messageId);
    
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Erro ao marcar mensagem como lida:', error);
    return { success: false, error };
  }
};

// Função para publicar demanda
export const publishDemand = async (demandData) => {
  try {
    const { data, error } = await supabase
      .from('demands')
      .insert({
        ...demandData,
        created_at: new Date().toISOString(),
        status: 'active'
      });
    
    if (error) throw error;
    
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao publicar demanda:', error);
    return { success: false, error };
  }
};

// Função para buscar demandas
export const fetchDemands = async (filters = {}) => {
  try {
    let query = supabase.from('demands').select('*');
    
    // Aplicar filtros se existirem
    if (Object.keys(filters).length > 0) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          query = query.eq(key, value);
        }
      });
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao buscar demandas:', error);
    return { success: false, error };
  }
};