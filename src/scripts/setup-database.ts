import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupDatabase() {
  try {
    console.log('Setting up database tables...')
    
    // This will be handled by Supabase migrations instead of direct SQL execution
    console.log('Database setup should be handled through Supabase migrations.')
    console.log('Please use the migration files in the supabase/migrations directory.')
    
    // Test connection
    const { data, error } = await supabase.from('users').select('count').limit(1)
    
    if (error) {
      console.error('Database connection test failed:', error.message)
    } else {
      console.log('Database connection successful!')
    }
    
  } catch (error) {
    console.error('Setup failed:', error)
  }
}

setupDatabase()