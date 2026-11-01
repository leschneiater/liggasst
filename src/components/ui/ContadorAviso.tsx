import React from 'react';
import { rotuloContador } from '../../utils/avisos';

// Bolinha com o numero de avisos. Nao aparece quando nao ha nada novo.
const ContadorAviso: React.FC<{ n: number; descricao: string; className?: string }> = ({ n, descricao, className = '' }) => {
  if (n <= 0) return null;
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-red-600 text-white text-xs font-semibold leading-none ${className}`}
      role="status"
      aria-label={descricao}
    >
      <span aria-hidden="true">{rotuloContador(n)}</span>
    </span>
  );
};

export default ContadorAviso;
