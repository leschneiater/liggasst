// Regras puras do fluxo de contratos entre empresa e profissional
// (testaveis, sem Supabase). Espelha o contrato verificado em
// supabase/tests/contratos_policy.test.mjs.

export interface ContratoRow {
  id: string;
  demand_id: string | null;
  company_id: string;
  professional_id: string;
  status: string;
  title: string | null;
  amount: number | null;
  starts_at: string | null;
  ends_at: string | null;
  progress: number | null;
  created_at: string;
  contraparte_nome: string | null;
  demanda_titulo: string | null;
}

export const ROTULOS_STATUS_CONTRATO: Record<string, string> = {
  pending: 'Aguardando resposta',
  accepted: 'Aceito',
  in_progress: 'Em andamento',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

export type PapelContrato = 'empresa' | 'profissional';

export type AcaoContrato = 'aceitar' | 'recusar' | 'concluir' | 'cancelar';

export const ROTULOS_ACAO_CONTRATO: Record<AcaoContrato, string> = {
  aceitar: 'Aceitar',
  recusar: 'Recusar',
  concluir: 'Concluir',
  cancelar: 'Cancelar',
};

// Acoes por status e papel, alinhadas com as RPCs do banco:
// - pendente: so o profissional responde (aceitar/recusar); a empresa pode
//   cancelar a proposta enquanto nao respondida;
// - em andamento: a empresa conclui; qualquer parte cancela;
// - encerrado (completed/cancelled): historico imutavel, sem acoes.
export const acoesDoContrato = (status: string, papel: PapelContrato): AcaoContrato[] => {
  if (status === 'pending') {
    return papel === 'profissional' ? ['aceitar', 'recusar'] : ['cancelar'];
  }
  if (status === 'in_progress' || status === 'accepted') {
    return papel === 'empresa' ? ['concluir', 'cancelar'] : ['cancelar'];
  }
  return [];
};

export const tituloDoContrato = (
  contrato: Pick<ContratoRow, 'title' | 'demanda_titulo'>,
): string =>
  contrato.title?.trim() || contrato.demanda_titulo?.trim() || 'Contrato de serviço';

// Texto do passo de confirmacao: cada acao diz o que acontece com a demanda
// vinculada, para ninguem fechar nada sem saber das consequencias.
export const textoConfirmacaoContrato = (
  acao: AcaoContrato,
  opcoes: { temDemanda: boolean; emAndamento: boolean },
): string => {
  const { temDemanda, emAndamento } = opcoes;
  switch (acao) {
    case 'aceitar':
      return temDemanda
        ? 'Aceitar esta proposta? A demanda sai da vitrine pública e o serviço fica em andamento.'
        : 'Aceitar esta proposta? O serviço fica em andamento.';
    case 'recusar':
      return temDemanda
        ? 'Recusar esta proposta? Ela fica no seu histórico como cancelada e a demanda continua na vitrine.'
        : 'Recusar esta proposta? Ela fica no seu histórico como cancelada.';
    case 'concluir':
      return temDemanda
        ? 'Concluir este contrato? A demanda vinculada também será concluída. Os dois ficam no seu histórico.'
        : 'Concluir este contrato? Ele fica no seu histórico.';
    case 'cancelar':
      if (emAndamento) {
        return temDemanda
          ? 'Cancelar este contrato? Ele fica no histórico como cancelado e a demanda vinculada volta à vitrine pública.'
          : 'Cancelar este contrato? Ele fica no histórico como cancelado.';
      }
      return temDemanda
        ? 'Cancelar esta proposta? Ela fica no histórico como cancelada e a demanda continua na vitrine.'
        : 'Cancelar esta proposta? Ela fica no histórico como cancelada.';
  }
};

export const formatarMoedaContrato = (valor: number | null): string | null =>
  valor === null || valor === undefined
    ? null
    : `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Datas do banco chegam como 'aaaa-mm-dd'; o sufixo T00:00:00 evita que o
// fuso vire o dia anterior na formatacao.
export const formatarDataContrato = (iso: string | null): string | null =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR') : null;

export interface ContratosSeparados {
  pendentes: ContratoRow[];
  emAndamento: ContratoRow[];
  historico: ContratoRow[];
}

export const separarContratos = (contratos: ContratoRow[]): ContratosSeparados => ({
  pendentes: contratos.filter((c) => c.status === 'pending'),
  emAndamento: contratos.filter((c) => c.status === 'in_progress' || c.status === 'accepted'),
  historico: contratos.filter((c) => c.status === 'completed' || c.status === 'cancelled'),
});
