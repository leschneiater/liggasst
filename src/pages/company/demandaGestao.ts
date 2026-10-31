// Regras puras do ciclo de vida de demandas da empresa (testaveis, sem Supabase).

export interface DemandaGestaoRow {
  id: string;
  title: string;
  description: string | null;
  service_type: string | null;
  city: string | null;
  state: string | null;
  budget: number | null;
  deadline: string | null;
  status: string;
  created_at: string;
}

export const ROTULOS_STATUS_DEMANDA: Record<string, string> = {
  draft: 'Rascunho',
  active: 'Ativa',
  in_progress: 'Em andamento',
  completed: 'Concluída',
  cancelled: 'Cancelada',
};

export type AcaoDemanda = 'editar' | 'concluir' | 'cancelar';

export const ROTULOS_ACAO_DEMANDA: Record<AcaoDemanda, string> = {
  editar: 'Editar',
  concluir: 'Concluir',
  cancelar: 'Cancelar',
};

// Enquanto nao ha contratos na plataforma, a empresa gerencia a demanda
// ativa: edita o conteudo, conclui (encontrou profissional) ou cancela.
// Concluidas/canceladas saem da vitrine publica (a policy demands_select so
// expoe status 'active' para outras contas) e ficam no historico da empresa.
const ACOES_POR_STATUS: Record<string, AcaoDemanda[]> = {
  active: ['editar', 'concluir', 'cancelar'],
};

export const acoesDaDemanda = (status: string): AcaoDemanda[] => ACOES_POR_STATUS[status] ?? [];

export const STATUS_DESTINO_ACAO: Partial<Record<AcaoDemanda, string>> = {
  concluir: 'completed',
  cancelar: 'cancelled',
};

export const TIPOS_SERVICO_DEMANDA = [
  'PCMSO - Programa de Controle Médico de Saúde Ocupacional',
  'PGR - Programa de Gerenciamento de Riscos',
  'LTCAT - Laudo Técnico de Condições Ambientais do Trabalho',
  'PPP - Perfil Profissiográfico Previdenciário',
  'PCMAT - Programa de Condições e Meio Ambiente de Trabalho',
  'Treinamentos NR (Normas Regulamentadoras)',
  'Consultoria em SST',
  'Auditoria de Segurança',
  'Perícia Técnica',
  'Elaboração de Procedimentos',
  'Análise de Riscos',
  'Outro',
];

export const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

// --- Exportacao CSV (mesmo padrao do relatorio admin) ---

const campo = (valor: string | number | null | undefined): string => {
  let texto = valor === null || valor === undefined ? '' : String(valor);
  // Protecao contra formula injection: titulos/cidades vem de entrada de
  // usuarios. Prefixa ' quando o conteudo comeca, apos espacos/tabs, com
  // caractere de formula de planilha.
  const semBorda = texto.replace(/^[\s\t\r\n]+/, '');
  if (/^[=+\-@]/.test(semBorda)) {
    texto = `'${texto}`;
  }
  return `"${texto.replace(/"/g, '""')}"`;
};

const linha = (valores: (string | number | null | undefined)[]): string =>
  valores.map(campo).join(';');

const dataBR = (iso: string): string => new Date(iso).toLocaleDateString('pt-BR');

export const montarCsvDemandasEmpresa = (demandas: DemandaGestaoRow[]): string => {
  const cabecalho = linha(['Título', 'Tipo de serviço', 'Cidade', 'UF', 'Orçamento (R$)', 'Prazo', 'Status', 'Publicada em']);
  const linhas = demandas.map((d) =>
    linha([
      d.title,
      d.service_type,
      d.city,
      d.state,
      d.budget,
      d.deadline ? dataBR(`${d.deadline}T00:00:00`) : '',
      ROTULOS_STATUS_DEMANDA[d.status] ?? d.status,
      dataBR(d.created_at),
    ])
  );
  return [cabecalho, ...linhas].join('\n');
};
