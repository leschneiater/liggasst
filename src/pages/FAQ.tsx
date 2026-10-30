import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Search, HelpCircle } from 'lucide-react';

const FAQ: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('geral');
  const [openQuestion, setOpenQuestion] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const categories = [
    { id: 'geral', label: 'Geral' },
    { id: 'cadastro', label: 'Cadastro e Acesso' },
    { id: 'planos', label: 'Planos e Pagamentos' },
    { id: 'profissionais', label: 'Para Profissionais' },
    { id: 'empresas', label: 'Para Empresas' },
    { id: 'seguranca', label: 'Segurança' }
  ];

  const faqData = {
    geral: [
      {
        question: 'O que é a LiggaSST?',
        answer: 'A LiggaSST é uma plataforma digital que conecta empresas com profissionais qualificados de Segurança do Trabalho em todo o Brasil, facilitando a contratação de serviços especializados em SST.'
      },
      {
        question: 'Como funciona a plataforma?',
        answer: 'Empresas buscam profissionais de SST por especialidade e localização e visualizam os perfis cadastrados. Profissionais criam perfis com formação e certificações. Empresas e profissionais com cadastro aprovado conversam diretamente pela área de mensagens.'
      },
      {
        question: 'A LiggaSST é gratuita?',
        answer: 'Sim, no momento o cadastro e o uso da plataforma são gratuitos para empresas e profissionais. Estamos avaliando planos pagos com recursos adicionais; qualquer mudança será comunicada antes.'
      }
    ],
    cadastro: [
      {
        question: 'Como criar uma conta na LiggaSST?',
        answer: 'Clique em "Cadastrar" no site, escolha se é profissional ou empresa e preencha os dados solicitados. Após o cadastro, você já consegue acessar o painel.'
      },
      {
        question: 'Quais documentos preciso para me cadastrar?',
        answer: 'Profissionais informam CPF e suas certificações de SST; empresas informam CNPJ e dados da empresa. O envio de certificados pelo painel ainda está em implantação.'
      },
      {
        question: 'Como recuperar minha senha?',
        answer: 'Na página de login, clique em "Esqueci minha senha", digite seu e-mail cadastrado e siga as instruções enviadas para redefinir sua senha.'
      }
    ],
    planos: [
      {
        question: 'Quais são os planos disponíveis?',
        answer: 'Hoje o uso é gratuito para profissionais e empresas. Os planos pagos exibidos na página Planos são uma proposta em avaliação e ainda não estão disponíveis para assinatura.'
      },
      {
        question: 'Posso cancelar minha assinatura?',
        answer: 'Ainda não existe cobrança nem assinatura paga na plataforma. Quando os planos pagos forem lançados, as condições de cancelamento serão informadas antes da contratação.'
      },
      {
        question: 'Como funciona o pagamento?',
        answer: 'Nenhum pagamento é processado hoje. As formas de pagamento serão informadas quando os planos pagos forem lançados.'
      }
    ],
    profissionais: [
      {
        question: 'Como recebo oportunidades de trabalho?',
        answer: 'Empresas encontram seu perfil pela busca e podem iniciar uma conversa pelo seu perfil. As conversas ficam na Central de Mensagens do seu painel.'
      },
      {
        question: 'Preciso pagar comissão?',
        answer: 'Não. No momento a plataforma é gratuita e não cobramos comissão dos profissionais.'
      },
      {
        question: 'Como faço upload dos meus certificados?',
        answer: 'O envio de certificados pelo painel ainda está em implantação. Quando estiver ativo, os documentos enviados ficarão disponíveis no seu perfil. A LiggaSST não faz verificação de documentos.'
      }
    ],
    empresas: [
      {
        question: 'Como encontrar profissionais qualificados?',
        answer: 'Use a busca de profissionais com os filtros disponíveis e visualize os perfis cadastrados. As certificações exibidas são informadas pelos próprios profissionais e ainda não são verificadas pela plataforma.'
      },
      {
        question: 'Os profissionais são verificados?',
        answer: 'Ainda não verificamos certificados ou documentos dos profissionais. Recomendamos solicitar a documentação diretamente ao profissional antes de contratar.'
      },
      {
        question: 'Posso gerenciar múltiplos projetos?',
        answer: 'A gestão de projetos ainda não está disponível. Hoje você pode publicar demandas e acompanhar o status no painel da empresa.'
      }
    ],
    seguranca: [
      {
        question: 'Meus dados estão seguros?',
        answer: 'Sim. Cada usuário acessa apenas as próprias informações, e a busca de profissionais exige login. O tratamento de dados pessoais está descrito na nossa Política de Privacidade.'
      },
      {
        question: 'Como denunciar condutas inadequadas?',
        answer: 'Ainda não temos um botão de denúncia dentro da plataforma. Se você identificar uma conduta inadequada, fale com a gente pela página Contato.'
      },
      {
        question: 'Posso bloquear usuários?',
        answer: 'Ainda não existe a opção de bloquear usuários. Se você tiver um problema com outro usuário, fale com a gente pela página Contato.'
      }
    ]
  };

  const currentFAQ = faqData[activeCategory as keyof typeof faqData] || [];
  
  const filteredFAQ = currentFAQ.filter(item =>
    item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-deep to-green-medium text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <HelpCircle size={64} className="mx-auto mb-6 text-green-light" />
          <h1 className="font-poppins font-bold text-4xl md:text-5xl mb-6">
            Dúvidas Frequentes
          </h1>
          <p className="font-roboto text-xl text-green-light mb-8">
            Encontre respostas para as principais dúvidas sobre a LiggaSST
          </p>

          {/* Search */}
          <div className="relative max-w-md mx-auto">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar dúvidas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-light"
            />
          </div>
        </div>
      </section>

      {/* Categories and FAQ */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Categories Sidebar */}
            <div className="lg:col-span-1">
              <h3 className="font-poppins font-semibold text-lg text-soft-black mb-4">
                Categorias
              </h3>
              <div className="space-y-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => {
                      setActiveCategory(category.id);
                      setOpenQuestion(null);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg font-roboto transition-colors duration-200 ${
                      activeCategory === category.id
                        ? 'bg-green-deep text-white'
                        : 'bg-neutral-gray text-gray-700 hover:bg-green-light'
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            {/* FAQ Content */}
            <div className="lg:col-span-3">
              <h2 className="font-poppins font-bold text-2xl text-soft-black mb-8">
                {categories.find(cat => cat.id === activeCategory)?.label}
              </h2>

              {filteredFAQ.length === 0 ? (
                <div className="text-center py-12">
                  <p className="font-roboto text-gray-600">
                    Nenhuma pergunta encontrada para os termos buscados.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredFAQ.map((item, index) => (
                    <div key={index} className="bg-neutral-gray rounded-xl overflow-hidden">
                      <button
                        onClick={() => setOpenQuestion(openQuestion === index ? null : index)}
                        className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-200 transition-colors duration-200"
                      >
                        <h3 className="font-poppins font-medium text-soft-black pr-4">
                          {item.question}
                        </h3>
                        {openQuestion === index ? (
                          <ChevronUp size={20} className="text-green-deep flex-shrink-0" />
                        ) : (
                          <ChevronDown size={20} className="text-green-deep flex-shrink-0" />
                        )}
                      </button>
                      
                      {openQuestion === index && (
                        <div className="px-6 pb-4">
                          <p className="font-roboto text-gray-700 leading-relaxed">
                            {item.answer}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-20 bg-green-deep text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-poppins font-bold text-3xl md:text-4xl mb-6">
            Não encontrou sua resposta?
          </h2>
          <p className="font-roboto text-xl text-green-light mb-8">
            Nossa equipe está pronta para ajudar você
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:contato@liggasst.com.br"
              className="px-8 py-3 bg-white text-green-deep rounded-lg hover:bg-green-light transition-colors duration-200 font-roboto font-medium"
            >
              Enviar E-mail
            </a>
            <a
              href="https://wa.me/5511988861490"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 border-2 border-white text-white rounded-lg hover:bg-white hover:text-green-deep transition-colors duration-200 font-roboto font-medium"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FAQ;
