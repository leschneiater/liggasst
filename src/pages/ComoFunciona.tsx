import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  UserCheck, 
  CheckCircle, 
  Building2, 
  Award, 
  Shield,
  Clock,
  Star,
  ArrowRight
} from 'lucide-react';
import Button from '../components/ui/Button';

const ComoFunciona: React.FC = () => {
  const stepsEmpresa = [
    {
      icon: Search,
      title: 'Cadastre sua Empresa',
      description: 'Crie seu perfil empresarial com dados da empresa e necessidades de SST'
    },
    {
      icon: UserCheck,
      title: 'Busque Profissionais',
      description: 'Use filtros por localização, especialidade e disponibilidade'
    },
    {
      icon: CheckCircle,
      title: 'Contrate com Segurança',
      description: 'Visualize certificações, avaliações e formalize a parceria'
    }
  ];

  const stepsProfissional = [
    {
      icon: Award,
      title: 'Crie seu Perfil',
      description: 'Cadastre seus dados, certificações e área de atuação'
    },
    {
      icon: Search,
      title: 'Receba Oportunidades',
      description: 'Empresas encontram seu perfil e entram em contato'
    },
    {
      icon: Shield,
      title: 'Feche Contratos',
      description: 'Negocie diretamente e formalize parcerias seguras'
    }
  ];

  const beneficios = [
    {
      icon: Clock,
      title: 'Rapidez',
      description: 'Encontre profissionais qualificados em minutos, não em semanas'
    },
    {
      icon: Shield,
      title: 'Segurança',
      description: 'Todos os profissionais são verificados e certificados'
    },
    {
      icon: Star,
      title: 'Qualidade',
      description: 'Sistema de avaliações garante a excelência dos serviços'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-deep to-green-medium text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-poppins font-bold text-4xl md:text-5xl mb-6">
            Como Funciona a LiggaSST
          </h1>
          <p className="font-roboto text-xl text-green-light max-w-3xl mx-auto">
            Conectamos empresas e profissionais de Segurança do Trabalho de forma simples, 
            rápida e segura em todo o Brasil
          </p>
        </div>
      </section>

      {/* Para Empresas */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center mb-4">
              <Building2 size={32} className="text-green-deep mr-3" />
              <h2 className="font-poppins font-bold text-3xl md:text-4xl text-soft-black">
                Para Empresas
              </h2>
            </div>
            <p className="font-roboto text-xl text-gray-600 max-w-2xl mx-auto">
              Encontre profissionais qualificados para suas demandas de SST
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {stepsEmpresa.map((step, index) => (
              <div key={index} className="text-center group">
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-green-light rounded-full flex items-center justify-center mx-auto group-hover:bg-green-medium transition-colors duration-300">
                    <step.icon size={32} className="text-green-deep group-hover:text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-deep text-white rounded-full flex items-center justify-center font-poppins font-bold">
                    {index + 1}
                  </div>
                </div>
                <h3 className="font-poppins font-semibold text-xl text-soft-black mb-3">
                  {step.title}
                </h3>
                <p className="font-roboto text-gray-600">
                  {step.description}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Button as={Link} to="/cadastro-empresa" size="lg" icon={ArrowRight} iconPosition="right">
              Cadastrar Empresa
            </Button>
          </div>
        </div>
      </section>

      {/* Para Profissionais */}
      <section className="py-20 bg-neutral-gray">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center mb-4">
              <Award size={32} className="text-green-deep mr-3" />
              <h2 className="font-poppins font-bold text-3xl md:text-4xl text-soft-black">
                Para Profissionais
              </h2>
            </div>
            <p className="font-roboto text-xl text-gray-600 max-w-2xl mx-auto">
              Amplie suas oportunidades de trabalho em todo o país
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {stepsProfissional.map((step, index) => (
              <div key={index} className="text-center group">
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-green-light rounded-full flex items-center justify-center mx-auto group-hover:bg-green-medium transition-colors duration-300">
                    <step.icon size={32} className="text-green-deep group-hover:text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-deep text-white rounded-full flex items-center justify-center font-poppins font-bold">
                    {index + 1}
                  </div>
                </div>
                <h3 className="font-poppins font-semibold text-xl text-soft-black mb-3">
                  {step.title}
                </h3>
                <p className="font-roboto text-gray-600">
                  {step.description}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Button as={Link} to="/cadastro-profissional" variant="secondary" size="lg" icon={ArrowRight} iconPosition="right">
              Cadastrar Profissional
            </Button>
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-poppins font-bold text-3xl md:text-4xl text-soft-black mb-4">
              Por que escolher a LiggaSST?
            </h2>
            <p className="font-roboto text-xl text-gray-600 max-w-2xl mx-auto">
              Oferecemos a melhor experiência para conectar empresas e profissionais
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {beneficios.map((beneficio, index) => (
              <div key={index} className="bg-neutral-gray p-8 rounded-2xl text-center hover:shadow-lg transition-shadow duration-300">
                <div className="w-16 h-16 bg-green-deep rounded-full flex items-center justify-center mx-auto mb-4">
                  <beneficio.icon size={24} className="text-white" />
                </div>
                <h3 className="font-poppins font-semibold text-xl text-soft-black mb-3">
                  {beneficio.title}
                </h3>
                <p className="font-roboto text-gray-600">
                  {beneficio.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-green-deep text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-poppins font-bold text-3xl md:text-4xl mb-6">
            Pronto para começar?
          </h2>
          <p className="font-roboto text-xl text-green-light mb-8">
            Junte-se a milhares de empresas e profissionais que já confiam na LiggaSST
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              as={Link} 
              to="/cadastro-empresa"
              size="lg"
              className="bg-white text-green-deep hover:bg-green-light"
            >
              Cadastrar Empresa
            </Button>
            <Button 
              as={Link} 
              to="/cadastro-profissional"
              variant="outline"
              size="lg"
              className="border-white text-white hover:bg-white hover:text-green-deep"
            >
              Cadastrar Profissional
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ComoFunciona;