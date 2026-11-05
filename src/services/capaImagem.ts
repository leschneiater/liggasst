// Prepara a capa do Radar para o bucket de 2 MB: fotos de celular em PNG
// passam facil do limite, entao re-encodamos para WebP/JPEG mantendo a
// proporcao ja validada. Sem canvas (testes/jsdom), devolve erro claro.
import { RADAR_CAPA_IDEAL, type ImagemIdeal } from './adsFormat';

export const LIMITE_CAPA_BYTES = RADAR_CAPA_IDEAL.maxMB * 1024 * 1024;

export function tamanhoLegivel(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1).replace('.', ',').replace(/,0$/, '')} MB`;
}

// Erros conhecidos do storage traduzidos para orientacao acionavel.
export function motivoFalhaCapa(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e ?? '');
  if (/exceeded the maximum allowed size/i.test(m)) return 'a imagem passa do limite de 2 MB';
  if (/mime|content-type|not allowed/i.test(m)) return 'o formato nao e aceito (use JPG, PNG ou WebP)';
  if (/row-level security|permission|not authorized|violates/i.test(m)) return 'sem permissao de escrita no armazenamento';
  return m ? `erro: ${m}` : 'erro desconhecido';
}

export async function prepararCapa(arquivo: File, ideal: ImagemIdeal = RADAR_CAPA_IDEAL): Promise<File> {
  if (arquivo.size <= LIMITE_CAPA_BYTES) return arquivo;
  const limiteMsg = `A imagem tem ${tamanhoLegivel(arquivo.size)} e o limite e ${ideal.maxMB} MB. Exporte uma versao menor (JPG costuma ficar bem menor que PNG) e tente de novo.`;
  try {
    const url = URL.createObjectURL(arquivo);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('imagem invalida'));
      i.src = url;
    });
    // 2x a largura ideal para telas densas, mantendo a proporcao.
    const escala = Math.min(1, (ideal.largura * 2) / img.naturalWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * escala));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * escala));
    const ctx = canvas.getContext('2d');
    URL.revokeObjectURL(url);
    if (!ctx) throw new Error('sem canvas');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = (await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/webp', 0.85)))
      ?? (await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.85)));
    if (!blob) throw new Error('sem encoder');
    if (blob.size > LIMITE_CAPA_BYTES) throw new Error('ainda grande');
    const ext = blob.type === 'image/webp' ? '.webp' : '.jpg';
    return new File([blob], arquivo.name.replace(/\.[^.]+$/, '') + ext, { type: blob.type });
  } catch {
    throw new Error(limiteMsg);
  }
}
