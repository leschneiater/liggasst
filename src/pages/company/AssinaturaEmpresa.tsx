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
            Veja o plano atual da sua empresa e a proposta dos planos pagos, ainda não disponíveis para assinatura
          </p>
        </div>

        {/* Plano real da conta (public.subscriptions) - versao de testes */}
        <StatusPlano papel="company" />

        {/* Plans Grid */}
        <div className="mb-8 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="font-roboto text-sm text-blue-900">
                Os planos pagos ainda não estão disponíveis para assinatura: valores e benefícios dos planos pagos são uma proposta em avaliação e podem mudar antes do lançamento. O plano gratuito reflete o que está disponível hoje.
            </p>
          </div>
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

              <Button variant="outline" fullWidth size="lg" disabled>
                {currentPlan === plan.id ? 'Plano Atual' : 'Em breve'}
              </Button>
            </div>
          ))}
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="font-roboto text-sm text-green-900">
            {proposta.notaSempreGratuito}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AssinaturaEmpresa;
