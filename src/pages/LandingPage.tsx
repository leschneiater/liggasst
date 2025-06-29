import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, 
  Users, 
  Shield, 
  CheckCircle, 
  Star, 
  ArrowRight,
  Building2,
  UserCheck,
  Award,
  Clock,
  TrendingUp,
  MapPin,
  Phone,
  Mail,
  Plus
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import Button from '../components/ui/Button';
import CadastroEmpresaModal from '../components/CadastroEmpresaModal';
import CadastroProfissionalModal from '../components/CadastroProfissionalModal';
import LoginModal from '../components/LoginModal';
import toast from 'react-hot-toast';

const LandingPage: React.FC = () => {
  const [isCadastroEmpresaOpen, setIsCadastroEmpresaOpen] = useState(false);
  const [isCadastroProfissionalOpen, setIsCadastroProfissionalOpen] = useState(false);
  const navigate = useNavigate();
  
  const { currentUser } = useAuth();
  const { user: supabaseUser } = useSupabaseAuth();

  const isLoggedIn = currentUser || supabaseUser;

  const handleBuscarProfissional = () => {
    if (isLoggedIn) {
      navigate('/busca-profissionais');
    } else {
      toast.error('Você precisa estar logado para buscar profissionais');
      setIsLoginModalOpen(true);
    }
  };

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const handleProtectedAction = (action: () => void, actionName: string) => {
    if (!isLoggedIn) {
      toast.error(`Você precisa estar logado para ${actionName}`);
      setIsLoginModalOpen(true);
      return;
    }
    action();
  };

  const steps = [
    {
      icon: Search,
      title: 'Busque Profissionais',
      description: 'Encontre especialistas qualificados em Segurança do Trabalho na sua região'
    },
    {
      icon: UserCheck,
      title: 'Analise Perfis',
      description: 'Visualize certificações, experiências e avaliações de outros clientes'
    },
    {
      icon: CheckCircle,
      title: 'Contrate com Segurança',
      description: 'Conecte-se diretamente e formalize parcerias com total transparência'
    }
  ];

  const benefits = {
    companies: [
      'Acesso a profissionais certificados',
      'Processos de contratação ágeis',
      'Relatórios detalhados de SST',
      'Suporte técnico especializado'
    ],
    professionals: [
      'Oportunidades em todo o Brasil',
      'Gestão simplificada de contratos',
      'Networking profissional',
      'Crescimento da reputação'
    ]
  };

  const testimonials = [
    {
      name: 'Maria Silva',
      role: 'Gerente de Segurança - TechCorp',
      content: 'Encontrei profissionais excelentes através da LiggaSST. A plataforma facilitou muito nosso processo de contratação.',
      rating: 5,
      company: 'TechCorp Ltda'
    },
    {
      name: 'João Santos',
      role: 'Técnico em Segurança do Trabalho',
      content: 'Consegui expandir minha carteira de clientes e organizar melhor meu trabalho. Recomendo para todos os colegas.',
      rating: 5,
      company: 'Profissional Autônomo'
    },
    {
      name: 'Ana Costa',
      role: 'Diretora - Indústria Moderna',
      content: 'A qualidade dos profissionais é excepcional. Nossa empresa se sente muito mais segura com os serviços contratados.',
      rating: 5,
      company: 'Indústria Moderna'
    }
  ];

  const stats = [
    { number: '5.000+', label: 'Profissionais Cadastrados', icon: Users },
    { number: '2.500+', label: 'Empresas Ativas', icon: Building2 },
    { number: '15.000+', label: 'Contratos Realizados', icon: CheckCircle },
    { number: '98%', label: 'Satisfação dos Clientes', icon: Star }
  ];

  return (
    <>
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-green-deep via-green-medium to-green-light text-white py-12 md:py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-10"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div className="animate-slide-up">
                <div className="inline-flex items-center bg-white bg-opacity-20 rounded-full px-4 py-2 mb-6">
                  <Shield size={16} className="mr-2" />
                  <span className="text-sm font-roboto">Plataforma Verificada e Segura</span>
                </div>
                <h1 className="font-poppins font-bold text-3xl md:text-4xl lg:text-6xl mb-6">
                  Profissionais de <span className="text-green-light">SST</span> onde você precisar
                </h1>
                <p className="font-roboto text-lg md:text-xl text-green-light mb-8 leading-relaxed">
                  Encontre e contrate especialistas de Segurança do Trabalho qualificados em qualquer lugar do Brasil. 
                  Conecte-se com confiança e segurança.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                  <Button 
                    onClick={handleBuscarProfissional}
                    size="lg"
                    className="bg-white text-green-deep hover:bg-green-deep hover:text-white border-white font-semibold w-full sm:w-auto transition-all duration-300"
                  >
                    <Search size={18} className="mr-2 flex-shrink-0" style={{ color: '#1B4332' }} />
                    <span style={{ color: '#1B4332' }}>Buscar Profissional</span>
                  </Button>
                  <Button 
                    onClick={() => setIsCadastroProfissionalOpen(true)}
                    variant="outline"
                    size="lg"
                    className="border-white text-white hover:bg-white hover:text-green-deep font-semibold w-full sm:w-auto transition-all duration-300"
                  >
                    <Users size={18} className="mr-2 flex-shrink-0" style={{ color: '#1B4332' }} />
                    <span style={{ color: '#1B4332' }}>Sou Profissional</span>
                  </Button>
                </div>
              </div>
              
              <div className="animate-fade-in">
                <div className="relative">
                  <img 
                    src="https://images.pexels.com/photos/5256816/pexels-photo-5256816.jpeg" 
                    alt="Profissionais de Segurança do Trabalho"
                    className="rounded-2xl shadow-2xl w-full h-auto"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center group">
                  <div className="w-16 h-16 bg-green-light rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-green-deep transition-colors duration-300">
                    <stat.icon size={24} className="text-green-deep group-hover:text-white" />
                  </div>
                  <div className="font-poppins font-bold text-3xl text-green-deep mb-2">
                    {stat.number}
                  </div>
                  <div className="font-roboto text-gray-600">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section className="py-12 md:py-20 bg-neutral-gray">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="font-poppins font-bold text-2xl md:text-3xl lg:text-4xl text-soft-black mb-4">
                Como Funciona
              </h2>
              <p className="font-roboto text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
                Processo simples e eficiente para conectar empresas e profissionais
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              {steps.map((step, index) => (
                <div key={index} className="bg-white p-8 rounded-2xl text-center group hover:shadow-xl transition-all duration-300">
                  <div className="mb-6">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-green-light rounded-full flex items-center justify-center mx-auto group-hover:bg-green-deep transition-colors duration-300">
                      <step.icon size={28} className="text-green-deep group-hover:text-white" />
                    </div>
                  </div>
                  <h3 className="font-poppins font-semibold text-lg md:text-xl text-soft-black mb-3">
                    {step.title}
                  </h3>
                  <p className="font-roboto text-gray-600">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-12 md:py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
              {/* Benefits for Companies */}
              <div className="bg-gradient-to-br from-green-light to-green-medium p-8 rounded-2xl shadow-lg text-white">
                <div className="flex items-center mb-6">
                  <Building2 size={32} className="text-white mr-3" />
                  <h3 className="font-poppins font-bold text-xl md:text-2xl">
                    Para Empresas
                  </h3>
                </div>
                <ul className="space-y-4">
                  {benefits.companies.map((benefit, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle size={20} className="text-white mr-3 mt-1 flex-shrink-0" />
                      <span className="font-roboto">{benefit}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => setIsCadastroEmpresaOpen(true)}
                  className="inline-block mt-6"
                >
                  <Button 
                    iconPosition="right" 
                    className="bg-white text-green-deep hover:bg-green-deep hover:text-white font-semibold transition-all duration-300"
                  >
                    <span style={{ color: '#1B4332' }}>Cadastrar Empresa</span>
                    <ArrowRight size={18} className="ml-2 flex-shrink-0" style={{ color: '#1B4332' }} />
                  </Button>
                </button>
              </div>

              {/* Benefits for Professionals */}
              <div className="bg-gradient-to-br from-green-deep to-green-medium p-8 rounded-2xl shadow-lg text-white">
                <div className="flex items-center mb-6">
                  <Award size={32} className="text-white mr-3" />
                  <h3 className="font-poppins font-bold text-xl md:text-2xl">
                    Para Profissionais
                  </h3>
                </div>
                <ul className="space-y-4">
                  {benefits.professionals.map((benefit, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle size={20} className="text-white mr-3 mt-1 flex-shrink-0" />
                      <span className="font-roboto">{benefit}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => setIsCadastroProfissionalOpen(true)}
                  className="inline-block mt-6"
                >
                  <Button 
                    iconPosition="right" 
                    className="bg-white text-green-deep hover:bg-green-deep hover:text-white font-semibold transition-all duration-300"
                  >
                    <span style={{ color: '#1B4332' }}>Cadastrar Profissional</span>
                    <ArrowRight size={18} className="ml-2 flex-shrink-0" style={{ color: '#1B4332' }} />
                  </Button>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-12 md:py-20 bg-neutral-gray">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="font-poppins font-bold text-2xl md:text-3xl lg:text-4xl text-soft-black mb-4">
                O que nossos usuários dizem
              </h2>
              <p className="font-roboto text-lg md:text-xl text-gray-600">
                Depoimentos reais de quem já usa a LiggaSST
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {testimonials.map((testimonial, index) => (
                <div key={index} className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} size={16} className="text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="font-roboto text-gray-700 mb-4 italic">
                    "{testimonial.content}"
                  </p>
                  <div className="border-t pt-4">
                    <p className="font-poppins font-semibold text-soft-black">
                      {testimonial.name}
                    </p>
                    <p className="font-roboto text-sm text-gray-600">
                      {testimonial.role}
                    </p>
                    <p className="font-roboto text-xs text-green-deep mt-1">
                      {testimonial.company}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust Section */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="font-poppins font-bold text-2xl md:text-3xl text-soft-black mb-4">
                Segurança e Confiança
              </h2>
              <p className="font-roboto text-lg text-gray-600 max-w-2xl mx-auto">
                Sua segurança é nossa prioridade. Todos os profissionais são verificados e a plataforma é protegida.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-light rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield size={24} className="text-green-deep" />
                </div>
                <h3 className="font-poppins font-semibold text-lg text-soft-black mb-2">
                  Profissionais Verificados
                </h3>
                <p className="font-roboto text-gray-600 text-sm">
                  Todos os certificados e documentos são verificados pela nossa equipe
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-green-light rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={24} className="text-green-deep" />
                </div>
                <h3 className="font-poppins font-semibold text-lg text-soft-black mb-2">
                  Pagamentos Seguros
                </h3>
                <p className="font-roboto text-gray-600 text-sm">
                  Transações protegidas e dados criptografados conforme LGPD
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-green-light rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star size={24} className="text-green-deep" />
                </div>
                <h3 className="font-poppins font-semibold text-lg text-soft-black mb-2">
                  Avaliações Reais
                </h3>
                <p className="font-roboto text-gray-600 text-sm">
                  Sistema de avaliações transparente e verificado
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Publique Demanda CTA */}
        <section className="py-16 bg-neutral-gray">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="font-poppins font-bold text-2xl md:text-3xl text-soft-black mb-6">
              Não encontrou o profissional ideal?
            </h2>
            <p className="font-roboto text-lg text-gray-600 mb-8">
              Publique sua demanda e receba propostas de profissionais qualificados
            </p>
            <Button 
              onClick={() => handleProtectedAction(() => navigate('/publique-demanda'), 'publicar demanda')}
              size="lg"
              icon={Plus}
              className="bg-green-deep text-white hover:bg-green-medium font-semibold"
            >
              Publicar Demanda
            </Button>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-12 md:py-20 bg-gradient-to-r from-green-deep to-green-medium text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="font-poppins font-bold text-2xl md:text-3xl lg:text-4xl mb-6">
              Pronto para começar?
            </h2>
            <p className="font-roboto text-lg md:text-xl text-green-light mb-8">
              Junte-se a milhares de empresas e profissionais que já confiam na LiggaSST
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <button onClick={() => setIsCadastroEmpresaOpen(true)}>
                <Button 
                  size="lg"
                  className="bg-white text-green-deep hover:bg-green-deep hover:text-white border-white font-semibold w-full sm:w-auto transition-all duration-300"
                >
                  <span style={{ color: '#1B4332' }}>Cadastrar Empresa</span>
                </Button>
              </button>
              <button onClick={() => setIsCadastroProfissionalOpen(true)}>
                <Button 
                  variant="outline"
                  size="lg"
                  className="border-white text-white hover:bg-white hover:text-green-deep font-semibold w-full sm:w-auto transition-all duration-300"
                >
                  <span style={{ color: '#1B4332' }}>Cadastrar Profissional</span>
                </Button>
              </button>
            </div>
            
            {/* Contact Info */}
            <div className="border-t border-green-light pt-8 mt-8">
              <p className="font-roboto text-green-light mb-4">Precisa de ajuda? Entre em contato:</p>
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4 text-sm">
                <div className="flex items-center">
                  <Mail size={16} className="mr-2" />
                  <span>contato@liggasst.com.br</span>
                </div>
                <div className="flex items-center">
                  <Phone size={16} className="mr-2" />
                  <span>(11) 98886-1490</span>
                </div>
              </div>
            </div>
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
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)}
        onOpenCadastroEmpresa={() => {
          setIsLoginModalOpen(false);
          setIsCadastroEmpresaOpen(true);
        }}
        onOpenCadastroProfissional={() => {
          setIsLoginModalOpen(false);
          setIsCadastroProfissionalOpen(true);
        }}
      />
    </>
  );
};

export default LandingPage;