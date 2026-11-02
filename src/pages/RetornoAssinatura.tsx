// Pagina de retorno do checkout hospedado do Asaas. NUNCA concede nada: o plano
// so muda pelo webhook (servidor). Aqui apenas consultamos subscriptions e
// mostramos o estado real. O redirecionamento do Asaas nao prova pagamento.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchAssinatura } from '../services/assinatura';
import type { Assinatura } from '../services/assinatura';

const TENTATIVAS = 15;
const INTERVALO_MS = 4000;

interface Props { resultado: 'sucesso' | 'cancelado' }

const RetornoAssinatura: React.FC<Props> = ({ resultado }) => {
  const { currentUser } = useAuth();
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null);
  const [esgotou, setEsgotou] = useState(false);
  const confirmada = !!assinatura && assinatura.plan !== 'free' && assinatura.status === 'active';

  useEffect(() => {
    if (resultado !== 'sucesso' || !currentUser) return;
    let vivo = true;
    let n = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      n++;
      try {
        const a = await fetchAssinatura(currentUser.id);
        if (!vivo) return;
        setAssinatura(a);
        if (a && a.plan !== 'free' && a.status === 'active') return;
      } catch { /* tenta de novo */ }
      if (n >= TENTATIVAS) { if (vivo) setEsgotou(true); return; }
      timer = setTimeout(tick, INTERVALO_MS);
    };
    tick();
    return () => { vivo = false; clearTimeout(timer); };
  }, [resultado, currentUser]);

  const destino = currentUser?.type === 'company' ? '/assinatura-empresa' : '/assinatura-profissional';

  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center" data-testid="retorno-assinatura">
      {resultado === 'cancelado' && (
        <>
          <h1 className="font-poppins font-bold text-2xl mb-3">Pagamento nao concluido</h1>
          <p className="font-roboto text-gray-600 mb-6">Nenhuma cobranca foi confirmada. Voce pode tentar de novo quando quiser.</p>
        </>
      )}
      {resultado === 'sucesso' && !currentUser && (
        <>
          <h1 className="font-poppins font-bold text-2xl mb-3">Entre para ver sua assinatura</h1>
          <p className="font-roboto text-gray-600 mb-6">Faca login para conferir o estado do seu plano.</p>
          <Link to="/auth/login" className="underline">Entrar</Link>
        </>
      )}
      {resultado === 'sucesso' && currentUser && confirmada && (
        <>
          <h1 className="font-poppins font-bold text-2xl mb-3">Assinatura ativa</h1>
          <p className="font-roboto text-gray-600 mb-6">Pagamento confirmado. Seu plano ja esta ativo.</p>
        </>
      )}
      {resultado === 'sucesso' && currentUser && !confirmada && !esgotou && (
        <>
          <h1 className="font-poppins font-bold text-2xl mb-3">Confirmando seu pagamento...</h1>
          <p className="font-roboto text-gray-600 mb-6">Isso costuma levar alguns segundos. Seu plano so e liberado depois da confirmacao do pagamento.</p>
        </>
      )}
      {resultado === 'sucesso' && currentUser && !confirmada && esgotou && (
        <>
          <h1 className="font-poppins font-bold text-2xl mb-3">Ainda nao recebemos a confirmacao</h1>
          <p className="font-roboto text-gray-600 mb-6">Se o pagamento foi feito, a confirmacao pode demorar. Volte em alguns minutos; seu plano so e liberado quando o pagamento e confirmado.</p>
        </>
      )}
      {currentUser && <Link to={destino} className="underline font-roboto">Ir para minha assinatura</Link>}
    </div>
  );
};

export default RetornoAssinatura;
