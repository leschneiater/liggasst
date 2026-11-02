// Seleciona a edge function por ambiente de cobranca, no BUILD (nunca por troca de ENV global).
// Padrao SEMPRE sandbox: so VITE_BILLING_ENV === 'production' aponta para as funcoes *-prod.
export type FuncaoBilling = 'asaas-checkout' | 'asaas-cancelar' | 'asaas-reembolso';
export const funcaoBilling = (nome: FuncaoBilling): string =>
  import.meta.env.VITE_BILLING_ENV === 'production' ? `${nome}-prod` : nome;
