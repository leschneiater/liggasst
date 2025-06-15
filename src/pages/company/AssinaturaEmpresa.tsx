import React, { useState } from 'react';
import { 
  Crown, 
  Check, 
  X, 
  CreditCard, 
  Calendar,
  Star,
  Zap,
  Shield,
  TrendingUp,
  Users,
  Building2
} from 'lucide-react';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';

const AssinaturaEmpresa: React.FC = () => {
  const [currentPlan] = useState('starter');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: { monthly: 0, yearly: 0 },
      icon: Star,
      popular: false,
      features: [
        'Cadastro da empresa',
        'Busca por profissionais',
        'Até 3 contatos/mês',
        'Perfil básico da empresa',
        'Suporte por e-mail'
      ],
      limitations: [
        'Sem acesso a relatórios',
        'Funcionalidades limitadas',
        'Sem gestão de equipe'
      ]
    },
    {
      id: 'business',
      name: 'Business',
      price: { monthly: 149, yearly: 1490 },
      icon: Zap,
      popular: true,
      features: [
        'Contatos ilimitados',
        'Relatórios completos',
        'Gestão de múltiplos projetos',
        'Integração com sistemas',
        'Suporte prioritário',
        'Perfil premium da empresa',
        'Análise de fornecedores'
      ],
      limitations: []
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: { monthly: 'Personalizado', yearly: 'Personalizado' },
      icon: Crown,
      popular: false,
      features: [
        'Todos os recursos do Business',
        'API dedicada',
        'Gestor de conta dedicado',
        'Treinamentos personalizados',
        'Integrações customizadas',
        'SLA garantido',
        'Consultoria estratégica'
      ],
      limitations: []
    }
  ];

  const currentPlanData = plans.find(p => p.id === currentPlan);

  const handleUpgrade = (planId: string) => {
    if (planId === currentPlan) return;
    
    if (planId === 'enterprise') {
      toast.success('Redirecionando para contato comercial');
    } else {
      toast.success(`Redirecionando para pagamento do plano ${plans.find(p => p.id === planId)?.name}`);
    }
    // Aqui você redirecionaria para o gateway de pagamento ou contato
  };

  const handleCancelSubscription = () => {
    toast.success('Assinatura cancelada com sucesso');
    // Aqui você processaria o cancelamento
  };

  const getDiscountPercentage = () => {
    return Math.round(((12 - 10) / 12) * 100); // 2 meses grátis = ~17% desconto
  };

  return (
    <div className="min-h-screen bg-neutral-gray py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-poppins font-bold text-3xl text-soft-black mb-2">
            Assinatura da Empresa
          </h1>
          <p className="font-roboto text-gray-600">
            Gerencie o plano da sua empresa e aproveite todos os recursos da LiggaSST
          </p>
        </div>

        {/* Current Plan Status */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-green-light rounded-full flex items-center justify-center">
                {currentPlanData && <currentPlanData.icon size={24} className="text-green-deep" />}
              </div>
              <div>
                <h2 className="font-poppins font-bold text-xl text-soft-black">
                  Plano {currentPlanData?.name}
                </h2>
                <p className="font-roboto text-gray-600">
                  {currentPlan === 'starter' 
                    ? 'Você está no plano gratuito'
                    : 'Próxima cobrança em 15 de Fevereiro, 2024'
                  }
                </p>
              </div>
            </div>
            
            {currentPlan !== 'starter' && (
              <div className="text-right">
                <p className="font-poppins font-bold text-2xl text-green-deep">
                  {typeof currentPlanData?.price.monthly === 'number' 
                    ? `R$ ${currentPlanData.price.monthly}/mês`
                    : currentPlanData?.price.monthly
                  }
                </p>
                <button
                  onClick={handleCancelSubscription}
                  className="font-roboto text-sm text-red-600 hover:text-red-800"
                >
                  Cancelar assinatura
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-white p-2 rounded-lg border border-gray-200">
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 rounded-md font-roboto font-medium transition-colors ${
                  billingCycle === 'monthly'
                    ? 'bg-green-deep text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Mensal
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-4 py-2 rounded-md font-roboto font-medium transition-colors relative ${
                  billingCycle === 'yearly'
                    ? 'bg-green-deep text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Anual
                <span className="absolute -top-2 -right-2 bg-green-medium text-white text-xs px-2 py-1 rounded-full">
                  -{getDiscountPercentage()}%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl shadow-sm p-8 relative ${
                plan.popular ? 'ring-2 ring-green-medium transform scale-105' : 'border border-gray-100'
              } ${currentPlan === plan.id ? 'ring-2 ring-green-deep' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-green-medium text-white px-4 py-2 rounded-full text-sm font-roboto font-medium">
                    Mais Popular
                  </span>
                </div>
              )}

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
                    {typeof plan.price[billingCycle] === 'number' 
                      ? `R$ ${plan.price[billingCycle]}`
                      : plan.price[billingCycle]
                    }
                  </span>
                  {typeof plan.price[billingCycle] === 'number' && (
                    <span className="font-roboto text-gray-600 ml-1">
                      {billingCycle === 'monthly' ? '/mês' : '/ano'}
                    </span>
                  )}
                </div>
                {billingCycle === 'yearly' && typeof plan.price.yearly === 'number' && plan.price.yearly > 0 && (
                  <p className="font-roboto text-sm text-green-600 mt-1">
                    Economize R$ {(plan.price.monthly * 12) - plan.price.yearly} por ano
                  </p>
                )}
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

              <Button
                onClick={() => handleUpgrade(plan.id)}
                variant={currentPlan === plan.id ? 'outline' : (plan.popular ? 'primary' : 'outline')}
                fullWidth
                size="lg"
                disabled={currentPlan === plan.id}
              >
                {currentPlan === plan.id 
                  ? 'Plano Atual' 
                  : plan.id === 'enterprise'
                    ? 'Entrar em Contato'
                    : typeof plan.price[billingCycle] === 'number' && plan.price[billingCycle] === 0
                      ? 'Downgrade' 
                      : 'Fazer Upgrade'
                }
              </Button>
            </div>
          ))}
        </div>

        {/* Benefits Section */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 mb-8">
          <h2 className="font-poppins font-bold text-2xl text-soft-black mb-6 text-center">
            Por que fazer upgrade?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <TrendingUp size={24} className="text-blue-600" />
              </div>
              <h3 className="font-poppins font-semibold text-lg text-soft-black mb-2">
                Relatórios Avançados
              </h3>
              <p className="font-roboto text-sm text-gray-600">
                Acesse relatórios detalhados sobre seus projetos e profissionais
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Shield size={24} className="text-green-600" />
              </div>
              <h3 className="font-poppins font-semibold text-lg text-soft-black mb-2">
                Suporte Prioritário
              </h3>
              <p className="font-roboto text-sm text-gray-600">
                Atendimento especializado com tempo de resposta reduzido
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Users size={24} className="text-purple-600" />
              </div>
              <h3 className="font-poppins font-semibold text-lg text-soft-black mb-2">
                Contatos Ilimitados
              </h3>
              <p className="font-roboto text-sm text-gray-600">
                Entre em contato com quantos profissionais precisar
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Building2 size={24} className="text-yellow-600" />
              </div>
              <h3 className="font-poppins font-semibold text-lg text-soft-black mb-2">
                Gestão Completa
              </h3>
              <p className="font-roboto text-sm text-gray-600">
                Ferramentas avançadas para gerenciar múltiplos projetos
              </p>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        {currentPlan !== 'starter' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="font-poppins font-semibold text-xl text-soft-black mb-4">
              Forma de Pagamento
            </h2>
            
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <CreditCard size={24} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-roboto font-medium text-soft-black">
                  Cartão de Crédito
                </p>
                <p className="font-roboto text-sm text-gray-600">
                  **** **** **** 1234 - Visa
                </p>
              </div>
              <Button variant="outline" size="sm">
                Alterar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssinaturaEmpresa;