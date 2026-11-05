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

// ---------------------------------------------------------------------------
// Colagem no editor (pedido dela 04/11): o texto que ela copia do ChatGPT no
// celular chega como text/html (web: h1-h3/strong/em/listas) ou como texto
// puro com quebras e, as vezes, markdown (##, **). Antes da normalizacao o
// HTML com div/span perdia as quebras (paragrafos grudavam) e h1 sumia.
// ---------------------------------------------------------------------------

const TITULOS: Record<string, 'h2' | 'h3' | 'h4'> = {
  h1: 'h2', h2: 'h2', h3: 'h3', h4: 'h4', h5: 'h4', h6: 'h4',
};
const BLOCO_GENERICO = new Set([
  'div', 'section', 'article', 'blockquote', 'header', 'footer', 'figure',
  'figcaption', 'aside', 'main', 'nav', 'pre', 'table', 'thead', 'tbody',
  'tfoot', 'tr', 'td', 'th', 'dl', 'dt', 'dd', 'form', 'fieldset',
]);
const IGNORAR = new Set([
  'script', 'style', 'meta', 'link', 'head', 'title', 'noscript', 'template',
  'iframe', 'object', 'embed', 'svg', 'canvas', 'img', 'picture', 'video',
  'audio', 'input', 'button', 'select', 'textarea', 'o:p',
]);

const textoDe = (n: Node) => (n as Text).data.replace(/\u00a0/g, ' ');

// Conteudo inline de um elemento: so texto, <br>, <strong> e <em>; qualquer
// outra tag inline (span, a, font, u, s, mark, code...) e desembrulhada.
function inlineDosFilhos(el: Element): string {
  let s = '';
  el.childNodes.forEach((n) => {
    if (n.nodeType === 3) { s += escapar(textoDe(n)); return; }
    if (n.nodeType !== 1) return;
    const e = n as Element;
    const tag = e.tagName.toLowerCase();
    if (IGNORAR.has(tag)) return;
    if (tag === 'br') { s += '<br>'; return; }
    if (tag === 'strong' || tag === 'b') { s += `<strong>${inlineDosFilhos(e)}</strong>`; return; }
    if (tag === 'em' || tag === 'i') { s += `<em>${inlineDosFilhos(e)}</em>`; return; }
    s += inlineDosFilhos(e);
  });
  return s;
}

// Tem bloco dentro? (Google Docs embrulha <p> dentro de <b>, por exemplo.)
function temBloco(el: Element): boolean {
  return el.querySelector('p,h1,h2,h3,h4,h5,h6,ul,ol,div,table,section,article,blockquote,pre') !== null;
}

function listaDe(lista: Element, tag: 'ul' | 'ol'): string {
  let itens = '';
  lista.childNodes.forEach((n) => {
    if (n.nodeType !== 1) return;
    const e = n as Element;
    if (e.tagName.toLowerCase() !== 'li') return;
    const inner = inlineDosFilhos(e).trim();
    if (inner) itens += `<li>${inner}</li>`;
  });
  return itens ? `<${tag}>${itens}</${tag}>` : '';
}

// Quebra um elemento em blocos permitidos, preservando as fronteiras de
// paragrafo que o HTML original marcava com div/p/titulos/listas.
function blocosDe(el: Element, out: string[]): void {
  let inline = '';
  const flush = () => {
    const limpo = inline.trim();
    if (limpo) out.push(`<p>${limpo}</p>`);
    inline = '';
  };
  el.childNodes.forEach((n) => {
    if (n.nodeType === 3) { inline += escapar(textoDe(n)); return; }
    if (n.nodeType !== 1) return;
    const e = n as Element;
    const tag = e.tagName.toLowerCase();
    if (IGNORAR.has(tag)) return;
    const titulo = TITULOS[tag];
    if (titulo) {
      flush();
      const inner = inlineDosFilhos(e).trim();
      if (inner) out.push(`<${titulo}>${inner}</${titulo}>`);
      return;
    }
    if (tag === 'ul' || tag === 'ol') { flush(); out.push(listaDe(e, tag)); return; }
    if (tag === 'p') {
      flush();
      const inner = inlineDosFilhos(e).trim();
      if (inner) out.push(`<p>${inner}</p>`);
      return;
    }
    if (BLOCO_GENERICO.has(tag)) { flush(); blocosDe(e, out); return; }
    // Inline de verdade: texto solto, br, strong/em, span/a/etc. Se um
    // elemento inline embrulha blocos (Docs), desce como bloco.
    if (tag !== 'br' && temBloco(e)) { flush(); blocosDe(e, out); return; }
    if (tag === 'br') { inline += '<br>'; return; }
    if (tag === 'strong' || tag === 'b') { inline += `<strong>${inlineDosFilhos(e)}</strong>`; return; }
    if (tag === 'em' || tag === 'i') { inline += `<em>${inlineDosFilhos(e)}</em>`; return; }
    inline += inlineDosFilhos(e);
  });
  flush();
}

// Markdown inline do texto puro: **negrito** e *italico* (texto ja escapado).
function markdownInline(texto: string): string {
  return escapar(texto)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
}

// Texto puro colado (app do ChatGPT no celular, bloco de notas...): cada
// linha vira um bloco; #/##/### viram titulos, - / 1. viram listas.
export function textoColadoParaHtml(texto: string): string {
  const linhas = texto.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  let lista: 'ul' | 'ol' | null = null;
  const fechaLista = () => {
    if (lista) { out.push(`</${lista}>`); lista = null; }
  };
  for (const bruta of linhas) {
    const linha = bruta.trim();
    if (!linha) { fechaLista(); continue; }
    const mTitulo = linha.match(/^(#{1,4})\s+(.*)$/);
    if (mTitulo) {
      fechaLista();
      const nivel = `h${Math.min(mTitulo[1].length + 1, 4)}`;
      out.push(`<${nivel}>${markdownInline(mTitulo[2])}</${nivel}>`);
      continue;
    }
    const mBullet = linha.match(/^[-•]\s+(.*)$/) ?? linha.match(/^\*\s+(.*)$/);
    if (mBullet) {
      if (lista !== 'ul') { fechaLista(); out.push('<ul>'); lista = 'ul'; }
      out.push(`<li>${markdownInline(mBullet[1])}</li>`);
      continue;
    }
    const mNum = linha.match(/^\d{1,3}[.)]\s+(.*)$/);
    if (mNum) {
      if (lista !== 'ol') { fechaLista(); out.push('<ol>'); lista = 'ol'; }
      out.push(`<li>${markdownInline(mNum[1])}</li>`);
      continue;
    }
    fechaLista();
    out.push(`<p>${markdownInline(linha)}</p>`);
  }
  fechaLista();
  return out.join('');
}

// Ponto unico da colagem: recebe o que a area de transferencia ofereceu e
// devolve o HTML restrito do Radar. HTML estruturado (ChatGPT web, Docs,
// Word) e normalizado preservando paragrafos, titulos e enfases; sem HTML
// util, cai no texto puro (quebras viram paragrafos, markdown vira formato).
export function colagemParaHtml(fonte: { html?: string | null; texto: string }): string {
  const html = (fonte.html ?? '').trim();
  if (html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const out: string[] = [];
    blocosDe(doc.body, out);
    const normalizado = out.join('');
    if (htmlParaTexto(normalizado)) return sanitizarHtmlRadar(normalizado);
  }
  return textoColadoParaHtml(fonte.texto);
}
