// Constantes e helpers puros do carrossel de anuncios (sem cliente
// supabase) para poderem ser testados sem env. O carrossel renderiza o
// banner em uma caixa fixa de proporcao 4:1 em todas as telas (decisao
// dela 04/11: tamanho fixo), com object-cover para ajuste fino.
export const AD_ARTE_IDEAL = {
  largura: 1600,
  altura: 400,
  proporcao: 4,
  tolerancia: 0.15,
  maxMB: 2,
} as const;

export interface ImagemIdeal {
  largura: number;
  altura: number;
  proporcao: number;
  tolerancia: number;
  maxMB: number;
  rotulo: string;
}

// Capa de artigo do Radar TST (pedido dela 04/11): 1200x630,
// proporcao fixa com o mesmo criterio do carrossel (validar/bloquear).
export const RADAR_CAPA_IDEAL: ImagemIdeal = {
  largura: 1200,
  altura: 630,
  proporcao: 1200 / 630,
  tolerancia: 0.15,
  maxMB: 2,
  rotulo: 'capa',
};

// Validacao BLOQUEANTE da proporcao (decisao dela 04/11: tamanho fixo).
// Retorna a mensagem de erro quando fora da tolerancia; null quando ok.
export function erroProporcao(ideal: ImagemIdeal, largura: number, altura: number): string | null {
  if (!(largura > 0) || !(altura > 0)) return null;
  const p = largura / altura;
  const min = ideal.proporcao * (1 - ideal.tolerancia);
  const max = ideal.proporcao * (1 + ideal.tolerancia);
  if (p >= min && p <= max) return null;
  const fmt = (n: number) => {
    const s = n >= 10 ? n.toFixed(0) : n.toFixed(1);
    return s.endsWith('.0') ? s.slice(0, -2) : s;
  };
  const atual = fmt(p);
  const esperada = fmt(ideal.proporcao);
  return `Esta ${ideal.rotulo} tem proporção ${atual}:1 e não pode ser usada. A proporção precisa ser ${esperada}:1 (${ideal.largura}×${ideal.altura} px).`;
}

export function erroProporcaoArte(largura: number, altura: number): string | null {
  return erroProporcao({ ...AD_ARTE_IDEAL, rotulo: 'arte' }, largura, altura);
}

export function erroProporcaoCapa(largura: number, altura: number): string | null {
  return erroProporcao(RADAR_CAPA_IDEAL, largura, altura);
}

// Le as dimensoes da imagem escolhida para o aviso de proporcao.
export function dimensoesArte(arquivo: File): Promise<{ largura: number; altura: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve({ largura: img.naturalWidth, altura: img.naturalHeight }); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('imagem invalida')); };
    img.src = url;
  });
}

