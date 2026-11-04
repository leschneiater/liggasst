// Aviso dos limites do plano gratuito (ligados em 03/11/2026): mostrado
// apenas para conta free, nas telas afetadas, com caminho para /planos.
import React from 'react';
import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';
import { AVISO_LIMITES } from '../utils/limitesPlano';

interface Props {
  tipo: keyof typeof AVISO_LIMITES;
  pago: boolean;
}

const AvisoLimitesPlano: React.FC<Props> = ({ tipo, pago }) => {
  if (pago) return null;
  return (
    <div
      data-testid={`aviso-limite-${tipo}`}
      className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3"
    >
      <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <p className="font-roboto text-sm text-amber-900">
        {AVISO_LIMITES[tipo]}{' '}
        <Link to="/planos" className="font-semibold underline hover:text-amber-950">
          Ver planos
        </Link>
      </p>
    </div>
  );
};

export default AvisoLimitesPlano;
