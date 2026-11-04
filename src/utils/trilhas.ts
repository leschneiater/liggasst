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
