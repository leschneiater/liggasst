// URL publica de arquivo em bucket publico do Supabase Storage, sem o
// cliente supabase (evita puxar lib/supabase para telas/testes que so
// precisam montar a URL).
export function publicStorageUrl(bucket: string, path: string): string {
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '';
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}
