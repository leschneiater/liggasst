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

// ---------- Visoes de calendario (mensal completa e planner semanal) ----------
// Pedido da dona em 04/11/2026 08:15: alem da lista, alternar entre
// calendario mensal e planner semanal. Semanas comecam na segunda-feira.

export type VisaoCalendario = 'lista' | 'mensal' | 'semanal';

export interface DiaGrade {
  iso: string; // yyyy-mm-dd
  dia: number;
  noMes: boolean;
}

const isoDe = (d: Date): string => {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
};

export const DIAS_SEMANA_CURTO = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] as const;
export const DIAS_SEMANA_LONGO = [
  'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira',
  'Sexta-feira', 'Sábado', 'Domingo',
] as const;

export const MESES_ANO = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
] as const;

// Segunda-feira da semana que contem a data.
export const inicioDaSemana = (d: Date): Date => {
  const copia = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const desloc = (copia.getDay() + 6) % 7; // domingo(0) vira 6, segunda(1) vira 0
  copia.setDate(copia.getDate() - desloc);
  return copia;
};

// Grade do mes: semanas completas (seg-dom) cobrindo o mes, com dias de
// preenchimento dos meses vizinhos marcados como noMes=false.
export const gradeDoMes = (ano: number, mes: number): DiaGrade[][] => {
  const primeiro = new Date(ano, mes, 1);
  const inicio = inicioDaSemana(primeiro);
  const semanas: DiaGrade[][] = [];
  const cursor = new Date(inicio);
  for (let s = 0; s < 6; s += 1) {
    const semana: DiaGrade[] = [];
    for (let d = 0; d < 7; d += 1) {
      semana.push({
        iso: isoDe(cursor),
        dia: cursor.getDate(),
        noMes: cursor.getMonth() === mes,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    semanas.push(semana);
    // Para quando a proxima semana ja comeca no mes seguinte.
    if (cursor.getMonth() !== mes && cursor.getDay() === 1) break;
  }
  return semanas.filter((semana) => semana.some((dia) => dia.noMes));
};

// Os 7 dias (seg-dom) da semana que contem a data.
export const diasDaSemana = (d: Date): DiaGrade[] => {
  const inicio = inicioDaSemana(d);
  return Array.from({ length: 7 }, (_, i) => {
    const dia = new Date(inicio);
    dia.setDate(inicio.getDate() + i);
    return { iso: isoDe(dia), dia: dia.getDate(), noMes: true };
  });
};

export const deslocarMes = (ano: number, mes: number, delta: number): { ano: number; mes: number } => {
  const d = new Date(ano, mes + delta, 1);
  return { ano: d.getFullYear(), mes: d.getMonth() };
};

export const deslocarSemana = (d: Date, deltaSemanas: number): Date => {
  const copia = new Date(d);
  copia.setDate(copia.getDate() + deltaSemanas * 7);
  return copia;
};

export const isoHoje = (): string => isoDe(new Date());

export const dataDeIso = (iso: string): Date => {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
};

export const rotuloMes = (ano: number, mes: number): string => `${MESES_ANO[mes]} de ${ano}`;

export const rotuloSemana = (dias: DiaGrade[]): string => {
  const primeiro = dataDeIso(dias[0].iso);
  const ultimo = dataDeIso(dias[6].iso);
  if (primeiro.getMonth() === ultimo.getMonth()) {
    return `${primeiro.getDate()} a ${ultimo.getDate()} de ${MESES_ANO[ultimo.getMonth()]} de ${ultimo.getFullYear()}`;
  }
  return `${primeiro.getDate()} de ${MESES_ANO[primeiro.getMonth()]} a ${ultimo.getDate()} de ${MESES_ANO[ultimo.getMonth()]} de ${ultimo.getFullYear()}`;
};

export const itensPorData = (itens: ItemConformidade[]): Record<string, ItemConformidade[]> => {
  const mapa: Record<string, ItemConformidade[]> = {};
  for (const item of itens) {
    (mapa[item.validade] ??= []).push(item);
  }
  return mapa;
};
