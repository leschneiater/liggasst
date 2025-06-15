import React from 'react';
import { 
  Users, 
  Target, 
  Eye, 
  Heart, 
  Award, 
  Shield,
  TrendingUp,
  CheckCircle
} from 'lucide-react';

const SobreNos: React.FC = () => {
  const values = [
    {
      icon: Shield,
      title: 'Segurança',
      description: 'Priorizamos a segurança em todos os aspectos, desde a proteção de dados até a verificação de profissionais.'
    },
    {
      icon: Heart,
      title: 'Confiança',
      description: 'Construímos relacionamentos baseados na transparência e na confiabilidade mútua.'
    },
    {
      icon: TrendingUp,
      title: 'Inovação',
      description: 'Utilizamos tecnologia de ponta para simplificar e otimizar processos complexos.'
    },
    {
      icon: Users,
      title: 'Colaboração',
      description: 'Acreditamos que juntos podemos criar ambientes de trabalho mais seguros e produtivos.'
    }
  ];

  const stats = [
    { number: '5.000+', label: 'Profissionais Cadastrados' },
    { number: '2.500+', label: 'Empresas Ativas' },
    { number: '15.000+', label: 'Contratos Realizados' },
    { number: '98%', label: 'Satisfação dos Clientes' }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-deep to-green-medium text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-poppins font-bold text-4xl md:text-5xl mb-6">
            Sobre a LiggaSST
          </h1>
          <p className="font-roboto text-xl text-green-light">
            Conectando empresas e profissionais de Segurança do Trabalho para criar 
            ambientes mais seguros em todo o Brasil.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-light rounded-full flex items-center justify-center mx-auto mb-6">
                <Target size={32} className="text-green-deep" />
              </div>
              <h3 className="font-poppins font-bold text-2xl text-soft-black mb-4">
                Nossa Missão
              </h3>
              <p className="font-roboto text-gray-600">
                Facilitar a conexão entre empresas e profissionais de SST, 
                promovendo ambientes de trabalho mais seguros e produtivos.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-light rounded-full flex items-center justify-center mx-auto mb-6">
                <Eye size={32} className="text-green-deep" />
              </div>
              <h3 className="font-poppins font-bold text-2xl text-soft-black mb-4">
                Nossa Visão
              </h3>
              <p className="font-roboto text-gray-600">
                Ser a principal plataforma de conexão para profissionais de 
                Segurança do Trabalho no Brasil até 2030.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-light rounded-full flex items-center justify-center mx-auto mb-6">
                <Award size={32} className="text-green-deep" />
              </div>
              <h3 className="font-poppins font-bold text-2xl text-soft-black mb-4">
                Nossos Valores
              </h3>
              <p className="font-roboto text-gray-600">
                Segurança, confiança, inovação e colaboração guiam 
                todas as nossas decisões e ações.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-neutral-gray">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-poppins font-bold text-3xl md:text-4xl text-soft-black mb-4">
              Nossos Valores
            </h2>
            <p className="font-roboto text-xl text-gray-600 max-w-2xl mx-auto">
              Os princípios que norteiam nossa atuação e definem nossa cultura organizacional
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div key={index} className="bg-white p-6 rounded-xl text-center hover:shadow-lg transition-shadow duration-300">
                <div className="w-12 h-12 bg-green-deep rounded-full flex items-center justify-center mx-auto mb-4">
                  <value.icon size={24} className="text-white" />
                </div>
                <h3 className="font-poppins font-semibold text-lg text-soft-black mb-3">
                  {value.title}
                </h3>
                <p className="font-roboto text-gray-600 text-sm">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-green-deep text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-poppins font-bold text-3xl md:text-4xl mb-4">
              Nossos Números
            </h2>
            <p className="font-roboto text-xl text-green-light">
              Resultados que demonstram nosso impacto no mercado de SST
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="font-poppins font-bold text-4xl md:text-5xl text-green-light mb-2">
                  {stat.number}
                </div>
                <div className="font-roboto text-white">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-poppins font-bold text-3xl md:text-4xl text-soft-black mb-6">
              Nossa História
            </h2>
          </div>

          <div className="prose prose-lg mx-auto">
            <p className="font-roboto text-gray-700 text-lg leading-relaxed mb-6">
              A LiggaSST nasceu da necessidade de simplificar e modernizar a forma como 
              empresas e profissionais de Segurança do Trabalho se conectam no Brasil. 
              Fundada em 2023, nossa plataforma surgiu da experiência de profissionais 
              que vivenciaram as dificuldades do setor.
            </p>

            <p className="font-roboto text-gray-700 text-lg leading-relaxed mb-6">
              Percebemos que empresas perdiam tempo procurando profissionais qualificados, 
              enquanto técnicos e engenheiros de segurança tinham dificuldade para encontrar 
              oportunidades adequadas ao seu perfil. Era necessária uma solução que 
              beneficiasse ambos os lados.
            </p>

            <p className="font-roboto text-gray-700 text-lg leading-relaxed">
              Hoje, somos a ponte que conecta milhares de profissionais e empresas, 
              contribuindo para a criação de ambientes de trabalho mais seguros em 
              todo o território nacional. Nossa tecnologia e dedicação continuam 
              transformando o mercado de SST no Brasil.
            </p>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-neutral-gray">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-poppins font-bold text-3xl md:text-4xl text-soft-black mb-4">
              Nossa Equipe
            </h2>
            <p className="font-roboto text-xl text-gray-600 mb-8">
              Por trás da LiggaSST, existe uma equipe comprometida em transformar a forma como empresas e profissionais de Segurança e Saúde do Trabalho se conectam no Brasil.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
            <div className="bg-white p-8 rounded-xl text-center">
              <div className="w-24 h-24 bg-green-light rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="font-poppins font-bold text-3xl text-green-deep">
                  LG
                </span>
              </div>
              <h3 className="font-poppins font-bold text-xl text-soft-black mb-2">
                👩‍💻 Letícia Schneiater Gentil
              </h3>
              <p className="font-roboto text-green-deep font-medium mb-4">
                CTO (Chief Technology Officer)
              </p>
              <p className="font-roboto text-gray-600 text-sm leading-relaxed">
                Especialista em branding, estratégia digital e inovação. Letícia lidera o desenvolvimento da experiência da plataforma, garantindo que cada detalhe reflita confiança, usabilidade e conexão verdadeira. Responsável por integrar tecnologia e propósito, ela atua como guardiã da visão criativa e da consistência da marca LiggaSST.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl text-center">
              <div className="w-24 h-24 bg-green-light rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="font-poppins font-bold text-3xl text-green-deep">
                  FG
                </span>
              </div>
              <h3 className="font-poppins font-bold text-xl text-soft-black mb-2">
                👨‍🔧 Fábio Gentil
              </h3>
              <p className="font-roboto text-green-deep font-medium mb-4">
                COO (Chief Operating Officer)
              </p>
              <p className="font-roboto text-gray-600 text-sm leading-relaxed">
                Técnico em Segurança do Trabalho com vivência de campo e visão prática do setor. Fábio atua como ponte entre as necessidades reais do mercado e as soluções oferecidas pela plataforma, coordenando as operações e promovendo um ambiente de parcerias sustentáveis, éticas e eficientes.
              </p>
            </div>
          </div>

          <div className="bg-green-deep text-white p-8 rounded-xl text-center">
            <h3 className="font-poppins font-bold text-2xl mb-6">
              Nosso Propósito
            </h3>
            <p className="font-roboto text-green-light text-lg mb-6">
              Criar uma rede sólida, descentralizada e confiável que valoriza o trabalho técnico e promove acesso facilitado a soluções de SST em qualquer lugar do país.
            </p>
            <p className="font-roboto text-white">
              Juntos, acreditamos que inovação, confiança e agilidade são o caminho para um mercado mais justo, colaborativo e moderno.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-green-deep text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-poppins font-bold text-3xl md:text-4xl mb-6">
            Faça Parte da Nossa História
          </h2>
          <p className="font-roboto text-xl text-green-light mb-8">
            Junte-se a milhares de profissionais e empresas que já confiam na LiggaSST
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/cadastro-empresa"
              className="px-8 py-3 bg-green-light text-green-deep rounded-lg hover:bg-green-deep hover:text-white transition-colors duration-200 font-roboto font-medium"
            >
              Cadastrar Empresa
            </a>
            <a
              href="/cadastro-profissional"
              className="px-8 py-3 border-2 border-white text-white rounded-lg hover:bg-green-deep hover:text-white transition-colors duration-200 font-roboto font-medium"
            >
              Cadastrar Profissional
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SobreNos;