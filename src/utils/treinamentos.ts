// Regras puras do modulo de treinamentos (sem dependencia do cliente Supabase,
// para uso em paginas e testes).

export type TrainingAudience = 'company' | 'professional' | 'both';
export type TrainingStatus = 'draft' | 'published';

// Defesa em profundidade no cliente; a regra vale de verdade na RLS e na
// Edge Function. Rascunhos nunca aparecem para membros.
export const treinamentoVisivelPara = (
  treinamento: { audience: TrainingAudience; status: TrainingStatus },
  role: 'company' | 'professional' | 'admin',
): boolean => {
  if (role === 'admin') return true;
  if (treinamento.status !== 'published') return false;
  if (treinamento.audience === 'both') return true;
  return treinamento.audience === role;
};
