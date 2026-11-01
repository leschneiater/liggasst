// Regras puras dos avisos dentro da plataforma (testaveis, sem Supabase).
// Sem estado novo no banco: cada aviso nasce de um dado que ja existe.

export interface MensagemAviso {
  sender_id?: string;
  receiver_id: string;
  read?: boolean | null;
}

export interface ContratoAviso {
  status: string;
}

// Mensagem nova = enviada para mim e ainda nao marcada como lida. A leitura
// continua sendo marcada ao abrir a conversa (ChatArea), entao o aviso some
// sozinho depois disso.
// Remetentes que eu bloqueei nao geram aviso (o bloqueio e meu: nao quero ser
// chamado por quem bloqueei). A lista da conversa continua mostrando a
// conversa e o contador dela, como hoje.
export const contarMensagensNaoLidas = (
  mensagens: MensagemAviso[],
  meuId: string,
  bloqueados: ReadonlySet<string> = new Set(),
): number =>
  meuId
    ? mensagens.filter((m) => m.receiver_id === meuId && !m.read && !bloqueados.has(m.sender_id ?? '')).length
    : 0;

// Proposta de contrato aguardando resposta: so o profissional responde um
// contrato pendente (aceitar/recusar). Para a empresa, pendente significa que
// ela espera o profissional, entao nao ha aviso. Respostas do profissional
// para a empresa nao geram aviso: o banco nao guarda se a empresa ja viu.
export const contarPropostasParaResponder = (
  contratos: ContratoAviso[],
  papel: 'empresa' | 'profissional',
): number => (papel === 'profissional' ? contratos.filter((c) => c.status === 'pending').length : 0);

export const rotuloContador = (n: number): string => (n > 9 ? '9+' : String(n));

export const textoMensagensNovas = (n: number): string =>
  n === 1 ? '1 mensagem nova' : `${n} mensagens novas`;

export const textoPropostasPendentes = (n: number): string =>
  n === 1 ? '1 proposta de contrato aguardando sua resposta' : `${n} propostas de contrato aguardando sua resposta`;
