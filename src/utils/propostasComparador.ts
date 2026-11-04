// Regras puras das propostas em demandas e do comparador (testaveis, sem
// Supabase). A proposta convive com o chat livre: enviar proposta nao
// substitui a conversa, e a empresa pode aceitar/recusar sem sair do chat.

export type StatusProposta = 'pending' | 'accepted' | 'declined' | 'withdrawn';

export const ROTULOS_STATUS_PROPOSTA: Record<StatusProposta, string> = {
  pending: 'Pendente',
  accepted: 'Aceita',
  declined: 'Recusada',
  withdrawn: 'Retirada',
};

export interface PropostaRow {
  id: string;
  demand_id: string;
  professional_id: string;
  amount: number | null;
  deadline_days: number | null;
  message: string;
  status: StatusProposta;
  created_at: string;
}

export interface EntradaValidacaoProposta {
  amount: number | null;
  deadlineDays: number | null;
  message: string;
}

// Valida o formulario do profissional. Valor e prazo sao opcionais (a
// proposta pode ser "a combinar"); a mensagem e obrigatoria para a empresa
// entender o que esta sendo oferecido.
export function validarProposta(e: EntradaValidacaoProposta): string[] {
  const erros: string[] = [];
  if (e.amount !== null && (!Number.isFinite(e.amount) || e.amount < 0)) {
    erros.push('Informe um valor válido (zero ou maior) ou deixe em branco para combinar.');
  }
  if (e.deadlineDays !== null && (!Number.isInteger(e.deadlineDays) || e.deadlineDays <= 0)) {
    erros.push('Informe um prazo em dias inteiro e maior que zero, ou deixe em branco.');
  }
  if (e.message.trim().length < 10) {
    erros.push('Descreva a proposta em pelo menos 10 caracteres.');
  }
  if (e.message.length > 2000) {
    erros.push('A mensagem da proposta aceita no máximo 2000 caracteres.');
  }
  return erros;
}

// Comparador: pendentes primeiro (sao as que pedem decisao), depois
// aceitas, recusadas e retiradas; dentro do grupo, mais recentes primeiro.
const ORDEM_STATUS: Record<StatusProposta, number> = {
  pending: 0,
  accepted: 1,
  declined: 2,
  withdrawn: 3,
};

export function ordenarParaComparacao<T extends Pick<PropostaRow, 'status' | 'created_at'>>(
  propostas: T[],
): T[] {
  return [...propostas].sort((a, b) => {
    const g = ORDEM_STATUS[a.status] - ORDEM_STATUS[b.status];
    if (g !== 0) return g;
    return b.created_at.localeCompare(a.created_at);
  });
}

export function contarPendentes(propostas: Pick<PropostaRow, 'status'>[]): number {
  return propostas.filter((p) => p.status === 'pending').length;
}

// O texto do aviso do comparador para conta free mora em
// AVISO_LIMITES.comparador (limitesPlano.ts), usado pelo AvisoLimitesPlano.

// Texto do botao/estado na lista de demandas da empresa.
export const textoLinkPropostas = (total: number): string =>
  total === 1 ? '1 proposta' : `${total} propostas`;
