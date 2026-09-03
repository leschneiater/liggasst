import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
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
