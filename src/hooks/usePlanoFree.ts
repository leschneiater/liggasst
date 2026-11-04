// Conta gratuita CONFIRMADA para exibir anuncios: fail-closed — so mostra
// anuncio depois de confirmar que NAO ha plano pago vigente (mesma regra
// de assinaturaPagaAtiva). Erro de leitura = nao mostra (assinante pago
// nunca ve anuncio por falha de rede).
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchAssinatura } from '../services/assinatura';
import { assinaturaPagaAtiva } from '../utils/assinaturaAcesso';

export function usePlanoFree(): boolean {
  const { currentUser } = useAuth();
  const [free, setFree] = useState(false);
  useEffect(() => {
    if (!currentUser) { setFree(false); return; }
    let vivo = true;
    fetchAssinatura(currentUser.id)
      .then((a) => { if (vivo) setFree(!assinaturaPagaAtiva(a)); })
      .catch(() => { if (vivo) setFree(false); });
    return () => { vivo = false; };
  }, [currentUser]);
  return free;
}
