import React from 'react';
import { Crown } from 'lucide-react';

// Selo de assinante pago (destaque premium) exibido nos cartoes de busca e
// vitrine. O booleano `destaque` vem das RPCs de busca, pela mesma regra
// unica de acesso pago (private.plano_da_conta).
const SeloPremium: React.FC = () => (
  <span
    className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-roboto font-medium rounded-full flex-shrink-0"
    title="Assinante de plano pago"
  >
    <Crown size={12} aria-hidden="true" />
    Premium
  </span>
);

export default SeloPremium;
