import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, X, Star, Crown } from 'lucide-react';
import Button from '../components/ui/Button';
import CadastroEmpresaModal from '../components/CadastroEmpresaModal';
import CadastroProfissionalModal from '../components/CadastroProfissionalModal';
import { PROPOSTA_PROFISSIONAL, PROPOSTA_EMPRESA, type PropostaPublico } from '../data/planosProposta';
import { useAuth } from '../contexts/AuthContext';

const Planos: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, userType: contaRole } = useAuth();
  const [userType, setUserType] = useState<'professional' | 'company'>('professional');
  const [isCadastroEmpresaOpen, setIsCadastroEmpresaOpen] = useState(false);
  const [isCadastroProfissionalOpen, setIsCadastroProfissionalOpen] = useState(false);

  const proposta: PropostaPublico = userType === 'professional' ? PROPOSTA_PROFISSIONAL : PROPOSTA_EMPRESA;
  const planos = [
    { name: proposta.gratuito.nome, price: 'R$ 0', period: '/mês', icon: Star, popular: false,
      features: proposta.gratuito.recursos, limitations: proposta.gratuito.limites },
    { name: proposta.pago.nome, price: `R$ ${proposta.pago.precoMensal.toFixed(2).replace('.', ',')}`, period: '/mês', icon: Crown, popular: true,
      features: proposta.pago.recursos, limitations: proposta.pago.limites },
  ];

  const handlePlanAction = (planName: string, price: string) => {
    // Conta logada nunca ve o modal de cadastro (bug: o botao Assinar pedia
    // login de novo para quem ja estava logada). Plano pago leva para a
    // pagina de assinatura do proprio papel, onde fica o checkout real;
    // "Comecar Gratis" de quem ja tem conta leva para o painel.
    if (currentUser) {
      if (price !== 'R$ 0') {
        if (contaRole === 'company') navigate('/assinatura-empresa');
        else if (contaRole === 'professional') navigate('/assinatura-profissional');
        else if (contaRole === 'admin') navigate('/admin');
        else navigate('/minha-capacitacao');
      } else if (contaRole === 'company') {
        navigate('/dashboard-empresa');
      } else if (contaRole === 'admin') {
        navigate('/admin');
      } else if (contaRole === 'employee') {
        navigate('/minha-capacitacao');
      } else {
        navigate('/dashboard-profissional');
      }
      return;
    }
    // Visitante: modal de cadastro (mesmo para plano pago - a conta e
    // necessaria antes de assinar).
    if (userType === 'professional') {
      setIsCadastroProfissionalOpen(true);
    } else {
      setIsCadastroEmpresaOpen(true);
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
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
                    disabled={plano.price !== 'R$ 0' && import.meta.env.VITE_BILLING_CONTRACT_ENABLED !== 'true'}
                  >
                    {plano.price === 'R$ 0' ? 'Começar Grátis' : (import.meta.env.VITE_BILLING_CONTRACT_ENABLED === 'true' ? 'Assinar' : 'Em breve')}
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
                  Você pode assinar os planos pagos pela sua conta, com as condições da página Planos.
                </p>
              </div>

              <div className="bg-neutral-gray p-6 rounded-xl">
                <h3 className="font-poppins font-semibold text-lg text-soft-black mb-2">
                  Haverá desconto para pagamento anual?
                </h3>
                <p className="font-roboto text-gray-600">
                  Não há desconto anual aprovado. As condições comerciais só serão confirmadas no lançamento dos planos pagos.
                </p>
              </div>

              <div className="bg-neutral-gray p-6 rounded-xl">
                <h3 className="font-poppins font-semibold text-lg text-soft-black mb-2">
                  O plano gratuito tem limitações?
                </h3>
                <p className="font-roboto text-gray-600">
                  O plano gratuito dá acesso às funcionalidades atuais da plataforma. Os limites previstos ainda não são aplicados.
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
