import React from 'react';
import { Star } from 'lucide-react';

interface EstrelasProps {
  nota: number;
  tamanho?: number;
  interativo?: boolean;
  onSelecionar?: (nota: number) => void;
  rotuloAcessivel?: string;
}

// Exibição (e escolha, quando interativo) da nota de 1 a 5 estrelas.
const Estrelas: React.FC<EstrelasProps> = ({
  nota,
  tamanho = 16,
  interativo = false,
  onSelecionar,
  rotuloAcessivel = `Nota ${nota} de 5`,
}) => {
  // Preenchimento proporcional por estrela (1 cheia, 0,5 meia etc.) para
  // que médias fracionadas não apareçam como 5 estrelas cheias.
  const preenchimentos = [1, 2, 3, 4, 5].map((i) => Math.min(Math.max(nota - (i - 1), 0), 1));
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={rotuloAcessivel}>
      {preenchimentos.map((fracao, i) => {
        const valor = i + 1;
        const icone = fracao >= 1 || fracao <= 0 ? (
          <Star
            size={tamanho}
            className={fracao > 0 ? 'text-amber-400' : 'text-gray-300'}
            fill={fracao > 0 ? 'currentColor' : 'none'}
            aria-hidden
          />
        ) : (
          <span className="relative inline-block" style={{ width: tamanho, height: tamanho }}>
            <Star size={tamanho} className="text-gray-300 absolute inset-0" fill="none" aria-hidden />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fracao * 100}%` }}>
              <Star size={tamanho} className="text-amber-400" fill="currentColor" aria-hidden />
            </span>
          </span>
        );
        return interativo ? (
          <button
            key={valor}
            type="button"
            onClick={() => onSelecionar?.(valor)}
            aria-label={`${valor} ${valor === 1 ? 'estrela' : 'estrelas'}`}
            className="p-0.5 focus:outline-none focus:ring-2 focus:ring-green-deep rounded"
          >
            {icone}
          </button>
        ) : (
          <span key={valor}>{icone}</span>
        );
      })}
    </span>
  );
};

export default Estrelas;
