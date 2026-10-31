// Monta os dados REAIS do painel administrativo a partir das consultas do
// servico (sem numeros inventados: cada card/secao tem fonte no banco).
// Funcoes puras para serem exercitadas em teste unitario.
import type { AdminMemberRow, AdminDemandRow, AdminContractRow } from '../../services/database';
import type { ReportRow } from '../../services/database';

export type TipoAtividade =
  | 'cadastro_profissional'
  | 'cadastro_empresa'
  | 'demanda'
  | 'denuncia'
  | 'contrato';

export interface AtividadeAdmin {
  id: string;
  tipo: TipoAtividade;
  descricao: string;
  timestamp: string;
}

export const montarFeedAtividade = (
  membros: AdminMemberRow[],
  demandas: AdminDemandRow[],
  denuncias: ReportRow[],
  contratos: AdminContractRow[],
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
  for (const d of demandas) {
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
  for (const c of contratos) {
    itens.push({
      id: `contrato-${c.id}`,
      tipo: 'contrato',
      descricao: 'Novo contrato criado',
      timestamp: c.created_at,
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

export const STATUS_CONTRATOS_ATIVOS = ['accepted', 'in_progress'] as const;

export const contarContratosAtivos = (contratos: AdminContractRow[]): number =>
  contratos.filter(c => (STATUS_CONTRATOS_ATIVOS as readonly string[]).includes(c.status)).length;

export const contratosNoPeriodo = (contratos: AdminContractRow[], desde: Date): number =>
  contratos.filter(c => new Date(c.created_at).getTime() >= desde.getTime()).length;

export interface MembroComContratos {
  id: string;
  nome: string;
  detalhe: string | null;
  local: string | null;
  extra: string | null;
  contratos: number;
}

// Ranking real por quantidade de contratos; so membros com pelo menos 1
// contrato aparecem (lista vazia vira estado vazio honesto na tela).
export const comMaisContratos = (
  membros: AdminMemberRow[],
  contratos: AdminContractRow[],
  role: 'professional' | 'company',
  limite = 3,
): MembroComContratos[] => {
  const campo = role === 'professional' ? 'professional_id' : 'company_id';
  const contagem = new Map<string, number>();
  for (const c of contratos) {
    const id = c[campo];
    contagem.set(id, (contagem.get(id) ?? 0) + 1);
  }
  const porId = new Map(membros.map(m => [m.id, m]));
  return [...contagem.entries()]
    .filter(([id]) => porId.get(id)?.role === role)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limite)
    .map(([id, n]) => {
      const m = porId.get(id) as AdminMemberRow;
      return {
        id,
        nome: m.display_name || 'sem nome',
        detalhe: role === 'professional' ? m.specialization : m.segment,
        local: [m.city, m.state].filter(Boolean).join(', ') || null,
        extra: role === 'company' ? m.employee_count : m.experience,
        contratos: n,
      };
    });
};
