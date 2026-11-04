// Regras puras do modulo de trilhas (sem dependencia do cliente Supabase,
// para uso em paginas e testes). Etapa 2: progresso e selos das trilhas
// abertas.

export type TrilhaKind = 'open' | 'certified';
export type SecaoContentType = 'youtube' | 'link' | 'pdf' | 'ebook';

// Resumo "2 de 5 seções" usado na lista de trilhas do membro.
export const resumoProgresso = (total: number, concluidas: number): string => {
  if (total <= 0) return 'Sem seções';
  const feitas = Math.min(concluidas, total);
  const rotulo = total === 1 ? 'seção' : 'seções';
  return `${feitas} de ${total} ${rotulo}`;
};

// O botão "Concluir seção" só habilita depois que o membro abriu o conteúdo
// daquela seção nesta visita (regra do produto, etapa 2); seção já concluída
// nunca volta a habilitar.
export const podeConcluirSecao = (
  secaoId: string,
  abertasNestaVisita: ReadonlySet<string>,
  concluidas: ReadonlySet<string>,
): boolean => abertasNestaVisita.has(secaoId) && !concluidas.has(secaoId);

// Trilha concluída = todas as seções com progresso (espelha o gatilho do
// banco; usado so para exibir o selo na hora, sem esperar refetch).
export const trilhaConcluida = (total: number, concluidas: number): boolean =>
  total > 0 && concluidas >= total;

export const ROTULO_CONTENT_TYPE: Record<SecaoContentType, string> = {
  youtube: 'Vídeo',
  link: 'Link externo',
  pdf: 'PDF',
  ebook: 'E-book',
};

// ---------- Etapa 3: avaliacao das trilhas 'certified' ----------

// Questao da prova como chega ao membro: SEM gabarito (o indice correto
// nunca sai do banco; a correcao acontece na RPC trail_exam_enviar).
export interface ProvaQuestao {
  q: string;
  enunciado: string;
  topico: string | null;
  opcoes: string[];
  resposta: number | null;
}

export interface InicioProva {
  attemptId: string;
  questoes: ProvaQuestao[];
  passScore: number;
  retomada: boolean;
}

export type ErroInicioProva =
  | 'indisponivel'
  | 'secoes_pendentes'
  | 'bloqueado'
  | 'banco_insuficiente'
  | 'nao_autenticado'
  | 'desconhecido';

export interface ResultadoProva {
  passed: boolean;
  score: number;
  passScore: number;
  // Reprovacao: data de liberacao da proxima tentativa e os topicos das
  // questoes erradas (sem revelar a alternativa certa).
  lockedUntil: string | null;
  topicos: string[];
}

// Data de liberacao do cadeado de 7 dias, em pt-BR ("12 de novembro").
export const formatarDataLiberacao = (iso: string): string =>
  new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' }).format(new Date(iso));

// Resumo da ultima tentativa para o cartao de avaliacao da trilha.
export type SituacaoProva =
  | { tipo: 'aprovado'; score: number }
  | { tipo: 'bloqueado'; lockedUntil: string }
  | { tipo: 'livre' };

export const situacaoProva = (tentativa: {
  finished_at: string | null;
  passed: boolean | null;
  score: number | null;
  locked_until: string | null;
} | null): SituacaoProva => {
  if (!tentativa || !tentativa.finished_at) return { tipo: 'livre' };
  if (tentativa.passed) return { tipo: 'aprovado', score: tentativa.score ?? 0 };
  if (tentativa.locked_until && new Date(tentativa.locked_until).getTime() > Date.now()) {
    return { tipo: 'bloqueado', lockedUntil: tentativa.locked_until };
  }
  return { tipo: 'livre' };
};
