// Calendario de conformidade da empresa (v1: so metadados + validade, sem
// upload de arquivo; decisao da dona em 04/11/2026). Regras puras e
// testaveis: a saude do item nasce da validade, sem estado novo no banco.

export interface ItemConformidade {
  id: string;
  company_id: string;
  titulo: string;
  tipo: string;
  validade: string; // date ISO (yyyy-mm-dd)
  responsavel: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export const TIPOS_DOCUMENTO = [
  'PGR',
  'PCMSO',
  'LTCAT',
  'ASO',
  'Treinamento NR',
  'Alvará ou licença',
  'Outro',
] as const;

// Documentos que vencem em ate este numero de dias entram no alerta.
export const DIAS_ALERTA_VENCIMENTO = 30;

export type SaudeItem = 'vencido' | 'a_vencer' | 'em_dia';

export const ROTULOS_SAUDE: Record<SaudeItem, string> = {
  vencido: 'Vencido',
  a_vencer: 'Vence em breve',
  em_dia: 'Em dia',
};

const meiaNoiteUtc = (d: Date): number =>
  Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());

export const diasParaVencer = (validade: string, hoje: Date): number => {
  const [ano, mes, dia] = validade.split('-').map(Number);
  const alvo = Date.UTC(ano, mes - 1, dia);
  return Math.round((alvo - meiaNoiteUtc(hoje)) / 86_400_000);
};

export const saudeItem = (validade: string, hoje: Date): SaudeItem => {
  const dias = diasParaVencer(validade, hoje);
  if (dias < 0) return 'vencido';
  if (dias <= DIAS_ALERTA_VENCIMENTO) return 'a_vencer';
  return 'em_dia';
};

// Alertas primeiro (vencido, depois a vencer), cada grupo por validade.
const PESO_SAUDE: Record<SaudeItem, number> = { vencido: 0, a_vencer: 1, em_dia: 2 };

export const ordenarItens = (itens: ItemConformidade[], hoje: Date): ItemConformidade[] =>
  [...itens].sort((a, b) => {
    const pa = PESO_SAUDE[saudeItem(a.validade, hoje)];
    const pb = PESO_SAUDE[saudeItem(b.validade, hoje)];
    if (pa !== pb) return pa - pb;
    return a.validade.localeCompare(b.validade);
  });

export interface ResumoSaude {
  vencidos: number;
  aVencer: number;
  emDia: number;
}

export const resumoSaude = (itens: ItemConformidade[], hoje: Date): ResumoSaude => {
  const r: ResumoSaude = { vencidos: 0, aVencer: 0, emDia: 0 };
  for (const item of itens) {
    const s = saudeItem(item.validade, hoje);
    if (s === 'vencido') r.vencidos += 1;
    else if (s === 'a_vencer') r.aVencer += 1;
    else r.emDia += 1;
  }
  return r;
};

const plural = (n: number, singular: string, pluralForm: string): string =>
  n === 1 ? `1 ${singular}` : `${n} ${pluralForm}`;

// Texto do alerta in-app (banner do painel da empresa). So chamado quando
// ha algo vencido ou a vencer.
export const textoAlertaConformidade = (r: ResumoSaude): string => {
  const partes: string[] = [];
  if (r.vencidos > 0) partes.push(`${plural(r.vencidos, 'documento vencido', 'documentos vencidos')}`);
  if (r.aVencer > 0) {
    partes.push(`${plural(r.aVencer, 'documento vence', 'documentos vencem')} em até ${DIAS_ALERTA_VENCIMENTO} dias`);
  }
  return `Conformidade: ${partes.join(' e ')}.`;
};
