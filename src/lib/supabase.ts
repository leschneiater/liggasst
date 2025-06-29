import { createClient } from '@supabase/supabase-js'

// Configuração para o servidor fornecido
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://liggasst.com.br/supabase-api'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpZ2dhc3N0IiwicGFyYW1zIjp7fSwiaWF0IjoxNjg3MzQ1NjIzLCJleHAiOjE3MTg4ODE2MjN9'

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not found, using default values')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

// Função para testar a conexão com o banco de dados
export const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('_test').select('*').limit(1)
    
    if (error) throw error
    
    return { success: true, data }
  } catch (error) {
    console.error('Erro na conexão com o Supabase:', error)
    return { success: false, error }
  }
}