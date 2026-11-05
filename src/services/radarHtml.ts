// HTML do conteudo dos artigos do Radar TST: sanitiza o que a admin cola ou
// formata (pedido dela 04/11: 3 pesos de titulo, negrito, italico, colar com
// formatacao) e converte artigos antigos em texto simples para o mesmo
// formato. Renderizacao sempre passa por aqui: nada de HTML cru na pagina.
import DOMPurify from 'dompurify';

// Permitido: paragrafo, quebra, negrito, italico, 3 niveis de titulo e listas.
const TAGS = ['p', 'br', 'strong', 'b', 'em', 'i', 'h2', 'h3', 'h4', 'ul', 'ol', 'li'];

export function sanitizarHtmlRadar(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: TAGS, ALLOWED_ATTR: [] });
}

const escapar = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Artigo antigo (texto simples): linha em branco separa paragrafos e a quebra
// simples vira <br>, igual ao whitespace-pre-line que a pagina usava.
export function textoLegadoParaHtml(texto: string): string {
  return texto
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapar(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

// HTML armazenado -> HTML seguro para renderizar. Conteudo antigo sem tags
// segue o caminho legado; qualquer coisa com tags e sanitizada de novo.
export function conteudoParaHtml(conteudo: string): string {
  if (!conteudo.includes('<')) return textoLegadoParaHtml(conteudo);
  return sanitizarHtmlRadar(conteudo);
}

// Texto puro do HTML (validacao de tamanho minimo no admin).
export function htmlParaTexto(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent ?? '').trim();
}
