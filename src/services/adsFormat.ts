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

// Validacao BLOQUEANTE da proporcao (decisao dela 04/11: tamanho fixo).
// Retorna a mensagem de erro quando fora da tolerancia; null quando ok.
export function erroProporcaoArte(largura: number, altura: number): string | null {
  if (!(largura > 0) || !(altura > 0)) return null;
  const p = largura / altura;
  const min = AD_ARTE_IDEAL.proporcao * (1 - AD_ARTE_IDEAL.tolerancia);
  const max = AD_ARTE_IDEAL.proporcao * (1 + AD_ARTE_IDEAL.tolerancia);
  if (p >= min && p <= max) return null;
  const atual = p >= 10 ? p.toFixed(0) : p.toFixed(1);
  return `Esta arte tem proporção ${atual}:1 e não pode ser usada. A proporção precisa ser 4:1 (${AD_ARTE_IDEAL.largura}×${AD_ARTE_IDEAL.altura} px).`;
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

