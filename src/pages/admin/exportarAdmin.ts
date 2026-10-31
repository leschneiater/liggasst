import { AdminOverview, AdminMemberRow, AdminDemandRow, ReportRow } from '../../services/database';

export const ROTULOS_PERIODO: Record<string, string> = {
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  '90d': 'Últimos 90 dias',
  '1y': 'Último ano',
};

const DIAS_PERIODO: Record<string, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365,
};

export const periodoDesde = (timeFilter: string, agora: Date = new Date()): Date => {
  const dias = DIAS_PERIODO[timeFilter] ?? 30;
  return new Date(agora.getTime() - dias * 24 * 60 * 60 * 1000);
};

const ROTULOS_MOTIVO: Record<string, string> = {
  'spam': 'Spam',
  'assedio': 'Assédio',
  'conteudo-improprio': 'Conteúdo impróprio',
  'golpe': 'Suspeita de golpe',
  'outro': 'Outro',
};

const ROTULOS_STATUS: Record<string, string> = {
  open: 'Aberta',
  reviewed: 'Analisada',
  actioned: 'Providenciada',
};

const ROTULOS_DEMANDA: Record<string, string> = {
  draft: 'Rascunho',
  active: 'Ativa',
  in_progress: 'Em andamento',
  completed: 'Concluída',
  cancelled: 'Cancelada',
};

const campo = (valor: string | number | null | undefined): string => {
  let texto = valor === null || valor === undefined ? '' : String(valor);
  // Proteção contra formula injection: campos vêm de entrada de membros
  // (nomes, detalhes de denúncia, títulos de demanda). Prefixa ' quando o
  // conteúdo começa, após espaços/tabs, com caractere de fórmula de planilha.
  const semBorda = texto.replace(/^[\s\t\r\n]+/, '');
  if (/^[=+\-@]/.test(semBorda)) {
    texto = `'${texto}`;
  }
  return `"${texto.replace(/"/g, '""')}"`;
};

const linha = (valores: (string | number | null | undefined)[]): string =>
  valores.map(campo).join(';');

const dataHoraBR = (iso: string): string => new Date(iso).toLocaleString('pt-BR');

const dataBR = (iso: string | null): string => iso ? new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR') : '';

export interface CsvAdminInput {
  visao: AdminOverview;
  membros: AdminMemberRow[];
  demandas: AdminDemandRow[];
  denuncias: ReportRow[];
  nomes: Record<string, string>;
  desde: Date;
  timeFilter: string;
  geradoEm?: Date;
}

export const montarCsvAdmin = ({ visao, membros, demandas, denuncias, nomes, desde, timeFilter, geradoEm = new Date() }: CsvAdminInput): string => {
  const profissionais = membros.filter(m => m.role === 'professional');
  const empresas = membros.filter(m => m.role === 'company');
  const partes: string[] = [
    linha(['Relatório completo do painel LiggaSST']),
    linha(['Gerado em', dataHoraBR(geradoEm.toISOString())]),
    linha(['Indicadores de período', `${ROTULOS_PERIODO[timeFilter] ?? timeFilter} (desde ${desde.toLocaleDateString('pt-BR')})`]),
    linha(['Listas', 'Completas na data de geração, independente do período']),
    '',
    linha(['Resumo']),
    linha(['Profissionais cadastrados (total)', visao.totalProfissionais]),
    linha(['Empresas cadastradas (total)', visao.totalEmpresas]),
    linha(['Novos profissionais no período', visao.novosProfissionaisPeriodo]),
    linha(['Novas empresas no período', visao.novasEmpresasPeriodo]),
    linha(['Demandas publicadas no período', visao.demandasPeriodo]),
    linha(['Denúncias abertas (total)', visao.denunciasAbertas]),
    linha(['Denúncias no período', visao.denunciasPeriodo]),
    '',
    linha([`Profissionais cadastrados (${profissionais.length})`]),
    linha(['Nome', 'E-mail', 'Telefone', 'Cidade', 'UF', 'Formação', 'Especialização', 'Experiência', 'Valor/hora (R$)', 'Cadastrado em']),
    ...profissionais.map(m => linha([
      m.display_name, m.email, m.phone, m.city, m.state,
      m.education, m.specialization, m.experience, m.hourly_rate,
      dataHoraBR(m.created_at),
    ])),
    '',
    linha([`Empresas cadastradas (${empresas.length})`]),
    linha(['Nome', 'E-mail', 'Telefone', 'Cidade', 'UF', 'Segmento', 'Porte', 'Responsável', 'E-mail do responsável', 'Telefone do responsável', 'Cadastrada em']),
    ...empresas.map(m => linha([
      m.display_name, m.email, m.phone, m.city, m.state,
      m.segment, m.employee_count, m.responsible_name, m.responsible_email, m.responsible_phone,
      dataHoraBR(m.created_at),
    ])),
    '',
    linha([`Demandas publicadas (${demandas.length})`]),
    linha(['Título', 'Empresa', 'Tipo de serviço', 'Cidade', 'UF', 'Orçamento (R$)', 'Prazo', 'Status', 'Publicada em']),
    ...demandas.map(d => linha([
      d.title, nomes[d.company_id] || 'Empresa', d.service_type, d.city, d.state,
      d.budget, dataBR(d.deadline), ROTULOS_DEMANDA[d.status] || d.status,
      dataHoraBR(d.created_at),
    ])),
    '',
    linha([`Denúncias registradas (${denuncias.length})`]),
    linha(['Data', 'Motivo', 'Status', 'Denunciante', 'Denunciado', 'Detalhes']),
    ...denuncias.map(d => linha([
      dataHoraBR(d.created_at),
      ROTULOS_MOTIVO[d.reason] || d.reason,
      ROTULOS_STATUS[d.status] || d.status,
      nomes[d.reporter_id] || 'Usuário',
      nomes[d.reported_id] || 'Usuário',
      d.details || '',
    ])),
  ];
  // BOM para o Excel abrir o UTF-8 corretamente
  return '\uFEFF' + partes.join('\r\n');
};
