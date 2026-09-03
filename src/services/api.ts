import { supabase } from '../lib/supabase';

// Função para fazer upload de arquivo
export const uploadFile = async (file: File, bucket: string, path: string) => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Obter URL pública do arquivo
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return { success: true, filePath, publicUrl: urlData.publicUrl };
  } catch (error) {
    console.error('Erro ao fazer upload de arquivo:', error);
    return { success: false, error };
  }
};

// Função para enviar email via API
export const sendEmail = async (to: string, subject: string, body: string) => {
  try {
    // Implementar integração com serviço de email
    // Esta é uma implementação de exemplo
    const response = await fetch('https://liggasst.com.br/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
    const { data, error, count } = await supabase
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
export const generateReport = async (reportType: string, filters: any) => {
  try {
    // Implementar geração de relatório
    // Esta é uma implementação de exemplo
    const response = await fetch('https://liggasst.com.br/api/generate-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabase.auth.getSession()}`
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