import { sanitizarHtmlRadar, textoLegadoParaHtml, conteudoParaHtml, htmlParaTexto } from '../radarHtml';

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
