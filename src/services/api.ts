import { supabase } from '../lib/supabase';

// Função para fazer upload de arquivo
export const uploadFile = async (
  file: File,
  bucket: 'profile-images' | 'documents',
  path: string
) => {
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw authError ?? new Error('Usuário não autenticado.');

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const safePath = path.replace(/[^a-zA-Z0-9/_-]/g, '').replace(/^\/+|\/+$/g, '');
    const filePath = `${authData.user.id}/${safePath ? `${safePath}/` : ''}${crypto.randomUUID()}.${fileExt}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    const { data: urlData, error: urlError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 3600);

    if (urlError) throw urlError;

    return { success: true, filePath, signedUrl: urlData.signedUrl };
  } catch (error) {
    console.error('Erro ao fazer upload de arquivo:', error);
    return { success: false, error };
  }
};

// Função para enviar email via API
export const sendEmail = async (to: string, subject: string, body: string) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Usuário não autenticado.');
    // Implementar integração com serviço de email
    // Esta é uma implementação de exemplo
    const response = await fetch('https://liggasst.com.br/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        to,
        subject,
        body
      }),
    });

    if (!response.ok) {
      throw new Error('Falha ao enviar email');
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return { success: false, error };
  }
};

// Função para verificar disponibilidade de nome de usuário
export const checkUsernameAvailability = async (username: string) => {
  try {
    const { error, count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' })
      .eq('username', username);

    if (error) throw error;

    return { success: true, available: count === 0 };
  } catch (error) {
    console.error('Erro ao verificar disponibilidade de username:', error);
    return { success: false, error };
  }
};

// Função para buscar dados de geolocalização
export const getGeolocationData = async (cep: string) => {
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    
    if (!response.ok) {
      throw new Error('CEP não encontrado');
    }
    
    const data = await response.json();
    
    if (data.erro) {
      throw new Error('CEP inválido');
    }
    
    return { 
      success: true, 
      data: {
        cep: data.cep,
        logradouro: data.logradouro,
        complemento: data.complemento,
        bairro: data.bairro,
        localidade: data.localidade,
        uf: data.uf
      }
    };
  } catch (error) {
    console.error('Erro ao buscar dados de geolocalização:', error);
    return { success: false, error };
  }
};

// Função para gerar relatório
export const generateReport = async (reportType: string, filters: Record<string, unknown>) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Usuário não autenticado.');
    // Implementar geração de relatório
    // Esta é uma implementação de exemplo
    const response = await fetch('https://liggasst.com.br/api/generate-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        reportType,
        filters
      }),
    });

    if (!response.ok) {
      throw new Error('Falha ao gerar relatório');
    }

    const blob = await response.blob();
    return { success: true, blob };
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    return { success: false, error };
  }
};
