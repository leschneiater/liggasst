import React from 'react';
import Estrelas from './Estrelas';
import { AvaliacaoRow, formatarDataAvaliacao } from '../contratos/avaliacaoGestao';

interface AvaliacoesRecebidasProps {
  recebidas: AvaliacaoRow[];
}

// Lista as avaliações reveladas recebidas pelo usuário (página de
// contratos). Comentário em revisão/removido pela moderação aparece
// sinalizado, nunca com o texto.
const AvaliacoesRecebidas: React.FC<AvaliacoesRecebidasProps> = ({ recebidas }) => {
  if (recebidas.length === 0) return null;
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mt-6">
      <h2 className="font-poppins font-semibold text-xl text-soft-black mb-2">Avaliações recebidas</h2>
      <ul className="divide-y divide-gray-100">
        {recebidas.map((a) => (
          <li key={a.id} className="py-3">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <Estrelas nota={a.score} rotuloAcessivel={`Nota ${a.score} de 5`} />
                <span className="font-roboto text-sm font-medium text-soft-black">
                  {a.contraparte_nome ?? '—'}
                </span>
              </div>
              <span className="font-roboto text-xs text-gray-400">{formatarDataAvaliacao(a.created_at)}</span>
            </div>
            <p className="font-roboto text-xs text-gray-500">{a.contrato_titulo ?? 'Contrato de serviço'}</p>
            {a.comment && <p className="font-roboto text-sm text-gray-600 mt-1">{a.comment}</p>}
            {a.comentario_oculto && !a.comment && (
              <p className="font-roboto text-xs text-gray-400 mt-1">Comentário oculto pela moderação.</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AvaliacoesRecebidas;
