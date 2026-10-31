// Decisao de acesso ao PDF de um treinamento. Modulo puro (sem Deno nem
// supabase-js) para ser exercitado em teste unitario e importado pelo
// index.ts da Edge Function.
export interface PerfilChamador {
  role: string;
  verification_status: string;
  is_test?: boolean;
}
export interface TreinamentoAlvo {
  audience: string;
  status: string;
  pdf_path: string | null;
  is_test?: boolean;
}
export type DecisaoAcesso =
  | { ok: true }
  | { ok: false; status: number; erro: string };

export const decidirAcessoPdf = (
  perfil: PerfilChamador | null,
  treinamento: TreinamentoAlvo | null,
): DecisaoAcesso => {
  if (!perfil || perfil.verification_status !== 'approved') {
    return { ok: false, status: 403, erro: 'conta nao aprovada' };
  }
  if (!treinamento || !treinamento.pdf_path) {
    return { ok: false, status: 404, erro: 'arquivo nao encontrado' };
  }
  const isAdmin = perfil.role === 'admin';
  // Conteudo de teste so existe para perfis de teste (e admin); para membro
  // real responde 404, espelhando a invisibilidade da RLS.
  if (!isAdmin && treinamento.is_test && !perfil.is_test) {
    return { ok: false, status: 404, erro: 'arquivo nao encontrado' };
  }
  const papelCobre =
    treinamento.audience === 'both' ||
    (treinamento.audience === 'company' && perfil.role === 'company') ||
    (treinamento.audience === 'professional' && perfil.role === 'professional');
  // admin ve tudo, inclusive rascunho; membro so publicado do seu publico
  if (!isAdmin && (treinamento.status !== 'published' || !papelCobre)) {
    return { ok: false, status: 403, erro: 'treinamento nao disponivel para este usuario' };
  }
  return { ok: true };
};
