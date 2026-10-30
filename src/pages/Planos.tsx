import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, Star, Crown, Zap } from 'lucide-react';
import Button from '../components/ui/Button';
import CadastroEmpresaModal from '../components/CadastroEmpresaModal';
import CadastroProfissionalModal from '../components/CadastroProfissionalModal';

const Planos: React.FC = () => {
  const [userType, setUserType] = useState<'professional' | 'company'>('professional');
  const [isCadastroEmpresaOpen, setIsCadastroEmpresaOpen] = useState(false);
  const [isCadastroProfissionalOpen, setIsCadastroProfissionalOpen] = useState(false);

  const planosProfissional = [
    {
      name: 'Gratuito',
      price: 'R$ 0',
      period: '/mês',
      icon: Star,
      popular: false,
      features: [
        'Cadastro de perfil com formação e especialidades',
        'Perfil visível na busca para empresas cadastradas',
        'Acesso gratuito'
      ],
      limitations: [
        'Mensagens, contratos, avaliações e certificados ainda em implantação',
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
        'Publicação e acompanhamento de demandas',
        'Perfil da empresa'
      ],
      limitations: [
        'Mensagens, contratos e relatórios ainda em implantação'
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

  const handlePlanAction = (planName: string, price: string) => {
    if (price === 'R$ 0') {
      // Plano gratuito - abrir modal de cadastro
      if (userType === 'professional') {
        setIsCadastroProfissionalOpen(true);
      } else {
        setIsCadastroEmpresaOpen(true);
      }
    } else if (price === 'Personalizado') {
      // Plano enterprise - redirecionar para contato
      window.location.href = '/contato';
    } else {
      // Planos pagos - abrir modal de cadastro
      if (userType === 'professional') {
        setIsCadastroProfissionalOpen(true);
      } else {
        setIsCadastroEmpresaOpen(true);
      }
    }
  };

  return (
    <>
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
            <div className="mb-8 bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="font-roboto text-sm text-blue-900">
                Os planos pagos ainda não estão disponíveis para assinatura: valores e benefícios dos planos pagos são uma proposta em avaliação e podem mudar antes do lançamento. O plano gratuito reflete o que está disponível hoje.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {planos.map((plano, index) => (
                <div
                  key={index}
                  className={`bg-white rounded-2xl shadow-lg p-8 relative ${
                    plano.popular ? 'ring-2 ring-green-medium transform scale-105' : ''
                  }`}
                >
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
                    onClick={() => handlePlanAction(plano.name, plano.price)}
                    variant={plano.popular ? 'primary' : 'outline'}
                    fullWidth
                    size="lg"
                    disabled={plano.price !== 'R$ 0' && plano.price !== 'Personalizado'}
                  >
                    {plano.price === 'R$ 0' ? 'Começar Grátis' : 
                     plano.price === 'Personalizado' ? 'Entrar em Contato' : 'Em breve'}
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
                  Os planos pagos já estão disponíveis?
                </h3>
                <p className="font-roboto text-gray-600">
                  Ainda não. Os valores e benefícios desta página são uma proposta em avaliação. Quando os planos pagos forem lançados, avisaremos os usuários cadastrados.
                </p>
              </div>

              <div className="bg-neutral-gray p-6 rounded-xl">
                <h3 className="font-poppins font-semibold text-lg text-soft-black mb-2">
                  Haverá desconto para pagamento anual?
                </h3>
                <p className="font-roboto text-gray-600">
                  A proposta inclui desconto para pagamento anual, mas as condições comerciais só serão confirmadas no lançamento dos planos pagos.
                </p>
              </div>

              <div className="bg-neutral-gray p-6 rounded-xl">
                <h3 className="font-poppins font-semibold text-lg text-soft-black mb-2">
                  O plano gratuito tem limitações?
                </h3>
                <p className="font-roboto text-gray-600">
                  O plano gratuito dá acesso às funcionalidades atuais da plataforma: cadastro de perfil, busca de profissionais e publicação de demandas. Áreas ainda em implantação são sinalizadas dentro da plataforma.
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
              <span style={{ color: '#1B4332' }}>Falar com Especialista</span>
            </Button>
          </div>
        </section>
      </div>

      {/* Modals */}
      <CadastroEmpresaModal 
        isOpen={isCadastroEmpresaOpen} 
        onClose={() => setIsCadastroEmpresaOpen(false)} 
      />
      <CadastroProfissionalModal 
        isOpen={isCadastroProfissionalOpen} 
        onClose={() => setIsCadastroProfissionalOpen(false)} 
      />
    </>
  );
};

export default Planos;
