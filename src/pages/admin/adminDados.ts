// Monta os dados REAIS do painel administrativo a partir das consultas do
// servico (sem numeros inventados: cada card/secao tem fonte no banco).
// Funcoes puras para serem exercitadas em teste unitario.
import type { AdminMemberRow, AdminDemandRow } from '../../services/database';
import type { ReportRow } from '../../services/database';

export type TipoAtividade =
  | 'cadastro_profissional'
  | 'cadastro_empresa'
  | 'demanda'
  | 'denuncia';

export interface AtividadeAdmin {
  id: string;
  tipo: TipoAtividade;
  descricao: string;
  timestamp: string;
}

// Demandas so entram nos numeros e no feed quando a empresa e um membro
// visivel do painel: fetchAdminMembers ja exclui perfis de teste, entao
// filtrar pela lista de membros espelha a mesma elegibilidade. Uma demanda
// de empresa de teste (ou removida) nao infla contadores nem aparece no feed.
export const filtrarDemandasVisiveis = (
  demandas: AdminDemandRow[],
  membros: AdminMemberRow[],
): AdminDemandRow[] => {
  const empresasVisiveis = new Set(
    membros.filter(m => m.role === 'company').map(m => m.id),
  );
  return demandas.filter(d => empresasVisiveis.has(d.company_id));
};

export const demandasNoPeriodo = (demandas: AdminDemandRow[], desde: Date): number =>
  demandas.filter(d => new Date(d.created_at).getTime() >= desde.getTime()).length;

export const montarFeedAtividade = (
  membros: AdminMemberRow[],
  demandas: AdminDemandRow[],
  denuncias: ReportRow[],
  limite = 20,
): AtividadeAdmin[] => {
  const itens: AtividadeAdmin[] = [];
  for (const m of membros) {
    if (m.role !== 'professional' && m.role !== 'company') continue;
    itens.push({
      id: `cadastro-${m.id}`,
      tipo: m.role === 'professional' ? 'cadastro_profissional' : 'cadastro_empresa',
      descricao:
        m.role === 'professional'
          ? `Novo profissional cadastrado: ${m.display_name || 'sem nome'}`
          : `Nova empresa cadastrada: ${m.display_name || 'sem nome'}`,
      timestamp: m.created_at,
    });
  }
  // mesma filtragem dos contadores: demanda de empresa fora da lista de
  // membros visiveis (teste/removida) nao vira evento do feed
  for (const d of filtrarDemandasVisiveis(demandas, membros)) {
    itens.push({
      id: `demanda-${d.id}`,
      tipo: 'demanda',
      descricao: `Nova demanda publicada: ${d.title}`,
      timestamp: d.created_at,
    });
  }
  for (const r of denuncias) {
    itens.push({
      id: `denuncia-${r.id}`,
      tipo: 'denuncia',
      descricao: 'Denúncia registrada',
      timestamp: r.created_at,
    });
  }
  return itens
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limite);
};

export interface RegiaoAdmin {
  state: string;
  profissionais: number;
  empresas: number;
}

// Contagem real de membros visiveis por UF; quem nao informou estado fica
// de fora (a lista de membros ja exclui teste e so contamos prof/empresa,
// entao admin nunca entra).
export const principaisRegioes = (membros: AdminMemberRow[], limite = 5): RegiaoAdmin[] => {
  const mapa = new Map<string, RegiaoAdmin>();
  for (const m of membros) {
    if (!m.state) continue;
    const r = mapa.get(m.state) ?? { state: m.state, profissionais: 0, empresas: 0 };
    if (m.role === 'professional') r.profissionais += 1;
    if (m.role === 'company') r.empresas += 1;
    mapa.set(m.state, r);
  }
  return [...mapa.values()]
    .sort((a, b) => b.profissionais + b.empresas - (a.profissionais + a.empresas))
    .slice(0, limite);
};
