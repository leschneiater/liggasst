import React, { useEffect, useState } from 'react';
import { Crown, Check, X, Star } from 'lucide-react';
import Button from '../../components/ui/Button';
import StatusPlano from '../../components/Assinatura/StatusPlano';
import { useAuth } from '../../contexts/AuthContext';
import { fetchAssinatura } from '../../services/assinatura';
import { PROPOSTA_EMPRESA } from '../../data/planosProposta';

const AssinaturaEmpresa: React.FC = () => {
  const { currentUser } = useAuth();
  const [currentPlan, setCurrentPlan] = useState('gratuito');
  useEffect(() => {
    let vivo = true;
    if (!currentUser) return;
    fetchAssinatura(currentUser.id)
      .then((a) => {
        if (!vivo || !a || a.plan === 'free') return;
        // so assinatura de PRODUCAO marca o card pago como atual (sandbox e teste)
        if (a.environment !== 'production') return;
        // plano pago ativo/cancelado-ate-o-fim: marca o card pago como atual
        if (['active', 'past_due', 'canceled'].includes(a.status)) setCurrentPlan('empresa');
      })
      .catch(() => { /* mantem gratuito */ });
    return () => { vivo = false; };
  }, [currentUser]);

  // Leva ao cartao do plano real (StatusPlano), onde fica o formulario de
  // contratacao com checkout Asaas.
  const irParaContratacao = () => {
    const el = document.querySelector('[data-testid="status-plano"]');
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const campo = el.querySelector('input');
    if (campo instanceof HTMLElement) window.setTimeout(() => campo.focus(), 400);
  };

  const proposta = PROPOSTA_EMPRESA;
  const plans = [
    { ...proposta.gratuito, name: proposta.gratuito.nome, price: proposta.gratuito.precoMensal,
      icon: Star, popular: false, features: proposta.gratuito.recursos, limitations: proposta.gratuito.limites },
    { ...proposta.pago, name: proposta.pago.nome, price: proposta.pago.precoMensal,
      icon: Crown, popular: true, features: proposta.pago.recursos, limitations: proposta.pago.limites },
  ];



  return (
    <div className="min-h-screen bg-neutral-gray py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-poppins font-bold text-3xl text-soft-black mb-2">
            Assinatura da Empresa
          </h1>
          <p className="font-roboto text-gray-600">
            Você pode assinar os planos pagos pela sua conta, com as condições da página Planos.
          </p>
        </div>

        {/* Plano real da conta (public.subscriptions) - versao de testes */}
        <StatusPlano papel="company" />

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 max-w-3xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl shadow-sm p-8 relative ${
                plan.popular ? 'ring-2 ring-green-medium transform scale-105' : 'border border-gray-100'
              } ${currentPlan === plan.id ? 'ring-2 ring-green-deep' : ''}`}
            >
              {currentPlan === plan.id && (
                <div className="absolute -top-4 right-4">
                  <span className="bg-green-deep text-white px-3 py-1 rounded-full text-xs font-roboto font-medium">
                    Plano Atual
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-green-light rounded-full flex items-center justify-center mx-auto mb-4">
                  <plan.icon size={24} className="text-green-deep" />
                </div>
                <h3 className="font-poppins font-bold text-2xl text-soft-black mb-2">
                  {plan.name}
                </h3>
                <div className="flex items-baseline justify-center">
                  <span className="font-poppins font-bold text-4xl text-green-deep">
                    R$ {plan.price.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="font-roboto text-gray-600 ml-1">/mês</span>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-start">
                    <Check size={16} className="text-green-medium mr-3 mt-1 flex-shrink-0" />
                    <span className="font-roboto text-gray-700">{feature}</span>
                  </div>
                ))}
                {plan.limitations.map((limitation, index) => (
                  <div key={index} className="flex items-start">
                    <X size={16} className="text-red-500 mr-3 mt-1 flex-shrink-0" />
                    <span className="font-roboto text-gray-500">{limitation}</span>
                  </div>
                ))}
              </div>

              {currentPlan === plan.id || import.meta.env.VITE_BILLING_CONTRACT_ENABLED !== 'true' ? (
                <Button variant="outline" fullWidth size="lg" disabled>
                  {currentPlan === plan.id ? 'Plano Atual' : 'Em breve'}
                </Button>
              ) : plan.id !== 'gratuito' ? (
                // Com a cobranca real ligada, a conta gratuita ve no card pago o
                // botao de upgrade, que leva ao formulario de contratacao real
                // (StatusPlano acima: dados de faturamento + aceite + checkout
                // Asaas). O card gratuito da conta pagante nao oferece downgrade.
                <Button variant="primary" fullWidth size="lg" onClick={irParaContratacao}>
                  Assinar o plano {plan.name}
                </Button>
              ) : null}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default AssinaturaEmpresa;
