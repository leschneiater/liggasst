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
        answer: 'Empresas cadastram suas necessidades e buscam profissionais qualificados. Profissionais criam perfis com suas especializações e recebem oportunidades. A plataforma facilita o contato direto entre as partes.'
      },
      {
        question: 'A LiggaSST é gratuita?',
        answer: 'Oferecemos planos gratuitos com funcionalidades básicas para empresas e profissionais. Para recursos avançados, temos planos pagos com diferentes níveis de benefícios.'
      }
    ],
    cadastro: [
      {
        question: 'Como criar uma conta na LiggaSST?',
        answer: 'Clique em "Cadastrar" no site, escolha se é profissional ou empresa, preencha os dados solicitados e confirme seu e-mail. Seu perfil estará ativo após a verificação.'
      },
      {
        question: 'Quais documentos preciso para me cadastrar?',
        answer: 'Profissionais precisam de CPF, certificações SST e comprovante de formação. Empresas precisam de CNPJ, dados do responsável técnico e documentos da empresa.'
      },
      {
        question: 'Como recuperar minha senha?',
        answer: 'Na página de login, clique em "Esqueci minha senha", digite seu e-mail cadastrado e siga as instruções enviadas para redefinir sua senha.'
      }
    ],
    planos: [
      {
        question: 'Quais são os planos disponíveis?',
        answer: 'Oferecemos planos gratuitos e pagos para profissionais e empresas. Os planos pagos incluem recursos avançados como destaque nas buscas, relatórios detalhados e suporte prioritário.'
      },
      {
        question: 'Posso cancelar minha assinatura?',
        answer: 'Sim, você pode cancelar sua assinatura a qualquer momento através do painel de controle. O acesso aos recursos premium permanece até o final do período pago.'
      },
      {
        question: 'Como funciona o pagamento?',
        answer: 'Aceitamos cartão de crédito, boleto bancário e PIX. O pagamento é processado mensalmente ou anualmente, conforme o plano escolhido.'
      }
    ],
    profissionais: [
      {
        question: 'Como recebo oportunidades de trabalho?',
        answer: 'Empresas visualizam seu perfil através da busca e entram em contato diretamente. Você recebe notificações por e-mail e na plataforma quando há interesse.'
      },
      {
        question: 'Preciso pagar comissão?',
        answer: 'Não cobramos comissão dos profissionais. Nossa receita vem das assinaturas dos planos premium. Você negocia diretamente com as empresas.'
      },
      {
        question: 'Como faço upload dos meus certificados?',
        answer: 'No seu painel, vá em "Certificados", clique em "Adicionar" e faça upload dos arquivos em PDF ou imagem. Verificamos a autenticidade dos documentos.'
      }
    ],
    empresas: [
      {
        question: 'Como encontrar profissionais qualificados?',
        answer: 'Use nossa ferramenta de busca com filtros por localização, especialidade, disponibilidade e avaliações. Visualize perfis completos antes de fazer contato.'
      },
      {
        question: 'Os profissionais são verificados?',
        answer: 'Sim, verificamos todos os certificados e documentos enviados pelos profissionais. Perfis verificados recebem selo de confiança na plataforma.'
      },
      {
        question: 'Posso gerenciar múltiplos projetos?',
        answer: 'Sim, nos planos pagos você pode criar e gerenciar múltiplos projetos, acompanhar o andamento e manter histórico de todas as contratações.'
      }
    ],
    seguranca: [
      {
        question: 'Meus dados estão seguros?',
        answer: 'Sim, utilizamos criptografia de ponta e seguimos as melhores práticas de segurança. Seus dados são protegidos conforme a LGPD.'
      },
      {
        question: 'Como denunciar condutas inadequadas?',
        answer: 'Temos um canal específico para denúncias. Clique em "Denunciar" no perfil do usuário ou entre em contato pelo suporte. Investigamos todos os casos.'
      },
      {
        question: 'Posso bloquear usuários?',
        answer: 'Sim, você pode bloquear usuários que não deseja mais receber contato. Acesse as configurações de privacidade no seu painel.'
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