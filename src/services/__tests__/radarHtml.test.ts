import { sanitizarHtmlRadar, textoLegadoParaHtml, conteudoParaHtml, htmlParaTexto, colagemParaHtml } from '../radarHtml';

describe('sanitizarHtmlRadar', () => {
  it('mantem titulos, negrito, italico, paragrafos e listas', () => {
    const html = '<h2>T</h2><h3>S</h3><h4>X</h4><p>um <strong>b</strong> e <em>i</em></p><ul><li>a</li></ul><ol><li>b</li></ol>';
    expect(sanitizarHtmlRadar(html)).toBe(html);
  });
  it('remove script, handlers e tags fora da lista', () => {
    const sujo = '<p onclick="x()">ok</p><script>alert(1)</script><img src=x onerror=alert(1)><a href="http://e">l</a><iframe src=x></iframe>';
    const limpo = sanitizarHtmlRadar(sujo);
    expect(limpo).toContain('<p>ok</p>');
    expect(limpo).toContain('l'); // texto do link fica, a tag sai
    expect(limpo).not.toMatch(/script|onclick|onerror|<img|<a |iframe/);
  });
  it('remove atributos das tags permitidas', () => {
    expect(sanitizarHtmlRadar('<h2 class="x" style="color:red">T</h2>')).toBe('<h2>T</h2>');
  });
});

describe('textoLegadoParaHtml', () => {
  it('linha em branco separa paragrafos e quebra simples vira br', () => {
    expect(textoLegadoParaHtml('p1\ncontinua\n\np2')).toBe('<p>p1<br>continua</p><p>p2</p>');
  });
  it('escapa html do texto antigo', () => {
    expect(textoLegadoParaHtml('a <b> c')).toBe('<p>a &lt;b&gt; c</p>');
  });
});

describe('conteudoParaHtml', () => {
  it('sem tags: caminho legado', () => {
    expect(conteudoParaHtml('texto simples')).toBe('<p>texto simples</p>');
  });
  it('com tags: sanitiza', () => {
    expect(conteudoParaHtml('<p>a</p><script>x</script>')).toBe('<p>a</p>');
  });
});

describe('htmlParaTexto', () => {
  it('extrai o texto para validacao', () => {
    expect(htmlParaTexto('<h2>Titulo</h2><p>corpo aqui</p>')).toContain('corpo aqui');
    expect(htmlParaTexto('<p></p>')).toBe('');
  });
});

describe('colagemParaHtml: HTML do ChatGPT web', () => {
  it('preserva titulos, negrito, italico e listas; h1 vira h2', () => {
    const html = '<h1 class="x">NR-01 e riscos psicossociais</h1>'
      + '<p>A inclusão expressa dos fatores de risco.</p>'
      + '<h2>O que muda na prática</h2>'
      + '<p>Um desafio: <strong>identificar</strong>, <em>avaliar</em> e propor.</p>'
      + '<ul><li>Mapear riscos</li><li>Registrar evidências</li></ul>';
    const r = colagemParaHtml({ html, texto: '' });
    expect(r).toContain('<h2>NR-01 e riscos psicossociais</h2>');
    expect(r).toContain('<h2>O que muda na prática</h2>');
    expect(r).toContain('<strong>identificar</strong>');
    expect(r).toContain('<em>avaliar</em>');
    expect(r).toContain('<ul><li>Mapear riscos</li><li>Registrar evidências</li></ul>');
    expect(r).not.toContain('class=');
  });
});

describe('colagemParaHtml: HTML so com div/span (app no Android)', () => {
  it('nao gruda paragrafos (regressao dela 04/11)', () => {
    const html = '<div><span>A inclusão expressa dos fatores de risco psicossociais '
      + 'contribuem para o adoecimento dos trabalhadores.</span></div>'
      + '<div><span>Para o Técnico de Segurança do Trabalho, surge um desafio.</span></div>';
    const r = colagemParaHtml({ html, texto: '' });
    expect(r).toBe('<p>A inclusão expressa dos fatores de risco psicossociais '
      + 'contribuem para o adoecimento dos trabalhadores.</p>'
      + '<p>Para o Técnico de Segurança do Trabalho, surge um desafio.</p>');
  });
});

describe('colagemParaHtml: Google Docs / Word', () => {
  it('desembrulha wrappers (b com estilo, span) e mantem paragrafos', () => {
    const html = '<b style="font-weight:normal" id="docs-internal-guid-x">'
      + '<p class="c1"><span class="c2">Primeiro parágrafo do documento.</span></p>'
      + '<p class="c1"><span class="c2">Segundo <b>parágrafo</b> com negrito.</span></p></b>';
    const r = colagemParaHtml({ html, texto: '' });
    expect(r).toContain('<p>Primeiro parágrafo do documento.</p>');
    expect(r).toContain('<p>Segundo <strong>parágrafo</strong> com negrito.</p>');
    expect(r).not.toContain('style=');
  });
});

describe('colagemParaHtml: texto puro (app do ChatGPT)', () => {
  it('cada quebra de linha vira paragrafo', () => {
    const r = colagemParaHtml({ texto: 'Linha um.\nLinha dois.\n\nLinha três.' });
    expect(r).toBe('<p>Linha um.</p><p>Linha dois.</p><p>Linha três.</p>');
  });
  it('converte markdown: titulos, negrito, italico', () => {
    const r = colagemParaHtml({ texto: '# Título grande\n## Seção\n### Sub\nTexto com **negrito** e *itálico*.' });
    expect(r).toContain('<h2>Título grande</h2>');
    expect(r).toContain('<h3>Seção</h3>');
    expect(r).toContain('<h4>Sub</h4>');
    expect(r).toContain('<p>Texto com <strong>negrito</strong> e <em>itálico</em>.</p>');
  });
  it('converte listas markdown em ul/ol', () => {
    const r = colagemParaHtml({ texto: '- mapear\n- registrar\n\n1. primeiro\n2. segundo' });
    expect(r).toContain('<ul><li>mapear</li><li>registrar</li></ul>');
    expect(r).toContain('<ol><li>primeiro</li><li>segundo</li></ol>');
  });
  it('escapa HTML que veio como texto', () => {
    const r = colagemParaHtml({ texto: 'Use a <b>tag</b> com cuidado.' });
    expect(r).toBe('<p>Use a &lt;b&gt;tag&lt;/b&gt; com cuidado.</p>');
  });
});

describe('colagemParaHtml: texto longo (800-1200 palavras)', () => {
  it('nao perde nenhuma palavra', () => {
    const paragrafo = Array.from({ length: 40 }, (_, i) => `palavra${i}`).join(' ');
    const texto = Array.from({ length: 25 }, () => paragrafo).join('\n\n');
    const r = colagemParaHtml({ texto });
    // conta as palavras com espaco no lugar das tags (textContent gruda blocos)
    const palavras = r.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean);
    expect(palavras.length).toBe(40 * 25);
    expect(r.match(/<p>/g)?.length).toBe(25);
  });
});

describe('colagemParaHtml: seguranca', () => {
  it('remove script e handlers do HTML colado', () => {
    const r = colagemParaHtml({ html: '<p onclick="x()">ok</p><script>alert(1)</script><img src=x onerror="y()">', texto: '' });
    expect(r).toBe('<p>ok</p>');
  });
  it('HTML vazio de texto cai no texto puro', () => {
    const r = colagemParaHtml({ html: '<img src="x.png">', texto: 'Conteúdo real.' });
    expect(r).toBe('<p>Conteúdo real.</p>');
  });
});
