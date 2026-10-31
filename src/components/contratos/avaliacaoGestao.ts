// Regras puras das avaliações mútuas após contrato concluído
// (testáveis, sem Supabase). Espelha o contrato verificado em
// supabase/tests/avaliacoes_policy.test.mjs.
//
// Decisões da usuária (WhatsApp 31/10/2026): avaliação mútua após
// conclusão (09:05); nota 1-5 + comentário opcional (09:06); visível a
// cadastrados (09:06); revelação cega até o par ou o fim do prazo
// (09:08); prazo de 14 dias (09:17); correção só enquanto oculta
// (09:18); denúncia com revisão pela admin (09:19); comentário em
// revisão fica oculto e a admin decide excluir o comentário (09:20).

export const PRAZO_AVALIACAO_DIAS = 14;
export const COMENTARIO_AVALIACAO_MAX = 1000;

export interface AvaliacaoPendente {
  contract_id: string;
  contraparte_nome: string | null;
  contrato_titulo: string | null;
  concluido_em: string;
  prazo_fim: string;
}

export interface AvaliacaoRow {
  id: string;
  contract_id: string;
  direcao: 'feita' | 'recebida';
  score: number;
  comment: string | null;
  comentario_oculto: boolean;
  created_at: string;
  contraparte_nome: string | null;
  contrato_titulo: string | null;
}

export interface AvaliacaoPerfil {
  id: string;
  rater_id: string;
  score: number;
  comment: string | null;
  created_at: string;
  autor_nome: string | null;
  contrato_titulo: string | null;
}

export interface ResumoAvaliacoes {
  media: number | null;
  total: number;
}

export const notaValida = (nota: number): boolean =>
  Number.isInteger(nota) && nota >= 1 && nota <= 5;

export const estrelasDaNota = (nota: number): boolean[] =>
  [1, 2, 3, 4, 5].map((i) => nota >= i);

export const formatarMedia = (media: number | null | undefined): string =>
  media === null || media === undefined || Number.isNaN(Number(media))
    ? '—'
    : Number(media).toFixed(1).replace('.', ',');

export const textoResumoAvaliacoes = (media: number | null, total: number): string =>
  total === 0
    ? 'Ainda sem avaliações'
    : `${formatarMedia(media)} de 5 · ${total} ${total === 1 ? 'avaliação' : 'avaliações'}`;

export const formatarDataAvaliacao = (iso: string | null | undefined): string =>
  iso ? new Date(iso).toLocaleDateString('pt-BR') : '';

export type EstadoAvaliacaoContrato =
  | 'pode-avaliar'
  | 'enviada-oculta'
  | 'revelada'
  | 'prazo-encerrado'
  | 'nao-concluido';

// Estado da avaliação do usuário em um contrato, dados status do
// contrato e o que ele já enviou/recebeu.
export const estadoAvaliacaoContrato = (
  statusContrato: string,
  pendente: boolean,
  feita: boolean,
  recebida: boolean,
): EstadoAvaliacaoContrato => {
  if (statusContrato !== 'completed') return 'nao-concluido';
  if (feita && recebida) return 'revelada';
  if (feita) return 'enviada-oculta';
  if (pendente) return 'pode-avaliar';
  return 'prazo-encerrado';
};

export const ROTULOS_MOTIVO_DENUNCIA: Record<string, string> = {
  spam: 'Spam',
  assedio: 'Assédio',
  'conteudo-improprio': 'Conteúdo impróprio',
  golpe: 'Suspeita de golpe',
  outro: 'Outro',
};

// Erros das RPCs de avaliação -> mensagem amigável. O banco é a
// autoridade final; aqui só traduzimos o que ele recusou.
export const mensagemErroAvaliacao = (mensagem: string): string => {
  if (mensagem.includes('prazo para avaliar')) {
    return 'O prazo de 14 dias para avaliar este contrato terminou.';
  }
  if (mensagem.includes('ja avaliou')) {
    return 'Você já avaliou este contrato.';
  }
  if (mensagem.includes('ja revelada')) {
    return 'Esta avaliação já foi revelada e não pode mais ser alterada.';
  }
  if (mensagem.includes('ainda nao avaliou') || mensagem.includes('ainda não avaliou')) {
    return 'Você ainda não avaliou este contrato.';
  }
  if (mensagem.includes('contratos concluidos')) {
    return 'Só é possível avaliar contratos concluídos.';
  }
  if (mensagem.includes('somente as partes')) {
    return 'Somente as partes do contrato podem avaliá-lo.';
  }
  return 'Não foi possível concluir a ação. Verifique o estado atual e tente de novo.';
};
