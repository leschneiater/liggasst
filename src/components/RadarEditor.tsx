// Editor rico do conteudo dos artigos do Radar TST (admin). Conteudo em HTML
// restrito (h2/h3/h4, negrito, italico, paragrafos e listas): a colagem passa
// pelo sanitizador antes de entrar, e o valor salvo e sempre o HTML interno.
import React, { useEffect, useRef } from 'react';
import { colagemParaHtml } from '../services/radarHtml';

interface Props {
  id: string;
  value: string;
  onChange: (html: string) => void;
  rotulo: string;
}

const BOTAO = 'px-2 py-1 rounded border border-gray-300 text-sm font-roboto hover:bg-gray-100';

const RadarEditor: React.FC<Props> = ({ id, value, onChange, rotulo }) => {
  const ref = useRef<HTMLDivElement>(null);

  // Sincroniza o valor externo (abrir edicao, limpar form) sem pisar no caret:
  // so reescreve o DOM quando o conteudo realmente diverge.
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value;
  }, [value]);

  const comando = (cmd: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const colar = (e: React.ClipboardEvent) => {
    e.preventDefault();
    // ChatGPT web chega em text/html; app no celular chega em texto puro,
    // as vezes com markdown. A conversao preserva paragrafos e formatos.
    const seguro = colagemParaHtml({
      html: e.clipboardData.getData('text/html'),
      texto: e.clipboardData.getData('text/plain'),
    });
    document.execCommand('insertHTML', false, seguro);
    if (ref.current) onChange(ref.current.innerHTML);
  };

  return (
    <div>
      <div className="flex items-center gap-1 mb-1" role="toolbar" aria-label={`Formatação: ${rotulo}`}>
        <button type="button" className={BOTAO} onClick={() => comando('formatBlock', 'h2')}>Título 1</button>
        <button type="button" className={BOTAO} onClick={() => comando('formatBlock', 'h3')}>Título 2</button>
        <button type="button" className={BOTAO} onClick={() => comando('formatBlock', 'h4')}>Título 3</button>
        <button type="button" className={`${BOTAO} font-bold`} onClick={() => comando('bold')}>B</button>
        <button type="button" className={`${BOTAO} italic`} onClick={() => comando('italic')}>I</button>
        <button type="button" className={BOTAO} onClick={() => comando('formatBlock', 'p')}>Texto</button>
      </div>
      <div
        id={id}
        ref={ref}
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label={rotulo}
        className="w-full min-h-[16rem] rounded-lg border border-gray-300 px-3 py-2 font-roboto text-sm radar-conteudo focus:outline-none focus:ring-2 focus:ring-green-deep"
        onInput={() => ref.current && onChange(ref.current.innerHTML)}
        onPaste={colar}
      />
    </div>
  );
};

export default RadarEditor;
