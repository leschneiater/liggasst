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

// Recorte da linha de public.subscriptions usado no gate pago. Mesma janela
// da policy radar_posts_select_pagantes e do helper private.plano_da_conta:
// pro ativo, ou cancelado/em atraso dentro do periodo pago, so producao.
export interface AssinaturaRow {
  plan: string;
  status: string;
  current_period_end: string | null;
  environment: string;
}

// hoje: YYYY-MM-DD (injetavel para teste). current_period_end e data ISO,
// entao a comparacao de strings basta.
export const assinaturaPagaJanela = (s: AssinaturaRow | null, hoje: string): boolean => {
  if (!s) return false;
  if (s.environment !== 'production') return false;
  if (s.plan !== 'pro_professional' && s.plan !== 'pro_company') return false;
  if (s.status === 'active') return true;
  if ((s.status === 'canceled' || s.status === 'past_due') && s.current_period_end) {
    return s.current_period_end >= hoje;
  }
  return false;
};

export const decidirAcessoPdf = (
  perfil: PerfilChamador | null,
  treinamento: TreinamentoAlvo | null,
  planoPago: boolean,
  acessoEquipe = false,
): DecisaoAcesso => {
  if (!perfil || perfil.verification_status !== 'approved') {
    return { ok: false, status: 403, erro: 'conta nao aprovada' };
  }
  if (!treinamento || !treinamento.pdf_path) {
    return { ok: false, status: 404, erro: 'arquivo nao encontrado' };
  }
  const isAdmin = perfil.role === 'admin';
  // Funcionario nao tem plano proprio: o acesso ao PDF vem da atribuicao
  // feita pela empresa pagante (RPC public.equipe_treinamento_acesso, que ja
  // confere vinculo ativo + plano da empresa). O publico (audience) nao se
  // aplica: a empresa escolhe o treinamento para a equipe.
  if (perfil.role === 'employee' && !isAdmin) {
    if (!acessoEquipe) {
      return { ok: false, status: 403, erro: 'treinamento nao atribuido a voce' };
    }
    if (treinamento.is_test && !perfil.is_test) {
      return { ok: false, status: 404, erro: 'arquivo nao encontrado' };
    }
    if (treinamento.status !== 'published') {
      return { ok: false, status: 403, erro: 'treinamento nao disponivel para este usuario' };
    }
    return { ok: true };
  }
  // Capacitacao e exclusiva de assinantes pagos (decisao da dona 03/11/2026);
  // admin gerencia e por isso baixa sem plano pago.
  if (!isAdmin && !planoPago) {
    return { ok: false, status: 403, erro: 'conteudo exclusivo para assinantes' };
  }
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
