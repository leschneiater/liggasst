import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, Star, Crown, Zap } from 'lucide-react';
import Button from '../components/ui/Button';

const Planos: React.FC = () => {
  const [userType, setUserType] = useState<'professional' | 'company'>('professional');

  const planosProfissional = [
    {
      name: 'Gratuito',
      price: 'R$ 0',
      period: '/mês',
      icon: Star,
      popular: false,
      features: [
        'Cadastro de perfil básico',
        'Até 3 certificados',
        'Receber até 5 contatos/mês',
        'Suporte por e-mail',
        'Acesso a biblioteca básica'
      ],
      limitations: [
        'Sem destaque nas buscas',
        'Relatórios limitados',
        'Sem selo de verificado'
      ]
    },
    {
      name: 'Profissional',
      price: 'R$ 49',
      period: '/mês',
      icon: Zap,
      popular: true,
      features: [
        'Perfil completo com destaque',
        'Certificados ilimitados',
        'Contatos ilimitados',
        'Selo de verificado',
        'Relatórios detalhados',
        'Biblioteca completa SST',
        'Suporte prioritário',
        'Ferramentas de gestão'
      ],
      limitations: []
    },
    {
      name: 'Premium',
      price: 'R$ 99',
      period: '/mês',
      icon: Crown,
      popular: false,
      features: [
        'Todos os recursos do Profissional',
        'Posição prioritária nas buscas',
        'Análise de performance',
        'Calendário integrado',
        'API para integrações',
        'Treinamentos exclusivos',
        'Consultoria personalizada'
      ],
      limitations: []
    }
  ];

  const planosEmpresa = [
    {
      name: 'Starter',
      price: 'R$ 0',
      period: '/mês',
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
      name: 'Business',
      price: 'R$ 149',
      period: '/mês',
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
      name: 'Enterprise',
      price: 'Personalizado',
      period: '',
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

  const planos = userType === 'professional' ? planosProfissional : planosEmpresa;

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-deep to-green-medium text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-poppins font-bold text-4xl md:text-5xl mb-6">
            Escolha seu Plano
          </h1>
          <p className="font-roboto text-xl text-green-light max-w-3xl mx-auto mb-8">
            Encontre o plano ideal para suas necessidades e comece a aproveitar todos os benefícios da LiggaSST
          </p>

          {/* User Type Toggle */}
          <div className="bg-white bg-opacity-20 rounded-full p-2 inline-flex">
            <button
              onClick={() => setUserType('professional')}
              className={`px-6 py-2 rounded-full font-roboto font-medium transition-all duration-200 ${
                userType === 'professional'
                  ? 'bg-white text-green-deep'
                  : 'text-white hover:bg-white hover:bg-opacity-10'
              }`}
            >
              Profissional
            </button>
            <button
              onClick={() => setUserType('company')}
              className={`px-6 py-2 rounded-full font-roboto font-medium transition-all duration-200 ${
                userType === 'company'
                  ? 'bg-white text-green-deep'
                  : 'text-white hover:bg-white hover:bg-opacity-10'
              }`}
            >
              Empresa
            </button>
          </div>
        </div>
      </section>

      {/* Plans Section */}
      <section className="py-20 bg-neutral-gray">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {planos.map((plano, index) => (
              <div
                key={index}
                className={`bg-white rounded-2xl shadow-lg p-8 relative ${
                  plano.popular ? 'ring-2 ring-green-medium transform scale-105' : ''
                }`}
              >
                {plano.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-green-medium text-white px-4 py-2 rounded-full text-sm font-roboto font-medium">
                      Mais Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-green-light rounded-full flex items-center justify-center mx-auto mb-4">
                    <plano.icon size={24} className="text-green-deep" />
                  </div>
                  <h3 className="font-poppins font-bold text-2xl text-soft-black mb-2">
                    {plano.name}
                  </h3>
                  <div className="flex items-baseline justify-center">
                    <span className="font-poppins font-bold text-4xl text-green-deep">
                      {plano.price}
                    </span>
                    <span className="font-roboto text-gray-600 ml-1">
                      {plano.period}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  {plano.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start">
                      <Check size={16} className="text-green-medium mr-3 mt-1 flex-shrink-0" />
                      <span className="font-roboto text-gray-700">{feature}</span>
                    </div>
                  ))}
                  {plano.limitations.map((limitation, limitationIndex) => (
                    <div key={limitationIndex} className="flex items-start">
                      <X size={16} className="text-red-500 mr-3 mt-1 flex-shrink-0" />
                      <span className="font-roboto text-gray-500">{limitation}</span>
                    </div>
                  ))}
                </div>

                <Button
                  as={Link}
                  to={userType === 'professional' ? '/cadastro-profissional' : '/cadastro-empresa'}
                  variant={plano.popular ? 'primary' : 'outline'}
                  fullWidth
                  size="lg"
                >
                  {plano.price === 'R$ 0' ? 'Começar Grátis' : 
                   plano.price === 'Personalizado' ? 'Entrar em Contato' : 'Assinar Agora'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-poppins font-bold text-3xl md:text-4xl text-soft-black mb-4">
              Dúvidas Frequentes sobre Planos
            </h2>
          </div>

          <div className="space-y-6">
            <div className="bg-neutral-gray p-6 rounded-xl">
              <h3 className="font-poppins font-semibold text-lg text-soft-black mb-2">
                Posso cancelar minha assinatura a qualquer momento?
              </h3>
              <p className="font-roboto text-gray-600">
                Sim, você pode cancelar sua assinatura a qualquer momento. O acesso permanece ativo até o final do período pago.
              </p>
            </div>

            <div className="bg-neutral-gray p-6 rounded-xl">
              <h3 className="font-poppins font-semibold text-lg text-soft-black mb-2">
                Existe desconto para pagamento anual?
              </h3>
              <p className="font-roboto text-gray-600">
                Sim, oferecemos 20% de desconto para assinaturas anuais em todos os planos pagos.
              </p>
            </div>

            <div className="bg-neutral-gray p-6 rounded-xl">
              <h3 className="font-poppins font-semibold text-lg text-soft-black mb-2">
                O plano gratuito tem limitações?
              </h3>
              <p className="font-roboto text-gray-600">
                O plano gratuito oferece funcionalidades básicas com algumas limitações. Você pode upgrade a qualquer momento.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-green-deep text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-poppins font-bold text-3xl md:text-4xl mb-6">
            Ainda tem dúvidas?
          </h2>
          <p className="font-roboto text-xl text-green-light mb-8">
            Entre em contato conosco e tire todas as suas dúvidas sobre nossos planos
          </p>
          <Button 
            as={Link} 
            to="/contato"
            size="lg"
            className="bg-white text-green-deep hover:bg-green-light"
          >
            Falar com Especialista
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Planos;