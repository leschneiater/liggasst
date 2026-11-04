// Plano pago da conta logada para avisos de limite: falha QUIETA (assume
// pago) ate confirmar conta free — o aviso nunca importuna pagante por
// falha de leitura. Bloqueios de verdade ficam no banco.
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchAssinatura } from '../services/assinatura';
import { assinaturaPagaAtiva } from '../utils/assinaturaAcesso';

export function usePlanoPago(): boolean {
  const { currentUser } = useAuth();
  const [pago, setPago] = useState(true);
  useEffect(() => {
    if (!currentUser) return;
    let vivo = true;
    fetchAssinatura(currentUser.id)
      .then((a) => { if (vivo) setPago(assinaturaPagaAtiva(a)); })
      .catch(() => { if (vivo) setPago(true); });
    return () => { vivo = false; };
  }, [currentUser]);
  return pago;
}
