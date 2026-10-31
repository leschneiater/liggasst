import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Build E2E local: app real com o cliente Supabase simulado (fixtures).
export default defineConfig({
  plugins: [react()],
  base: '/liggasst/',
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://e2e.local'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('e2e'),
  },
  resolve: {
    alias: [
      { find: /.*lib\/supabase$/, replacement: path.resolve(__dirname, 'src/lib/supabase.mock.ts') },
    ],
  },
  build: { outDir: 'dist-e2e' },
});
