import React from 'react';
import { FileText, Shield, AlertTriangle } from 'lucide-react';

const TermosUso: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-deep to-green-medium text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <FileText size={64} className="mx-auto mb-6 text-green-light" />
          <h1 className="font-poppins font-bold text-4xl md:text-5xl mb-6">
            Termos de Uso
          </h1>
          <p className="font-roboto text-xl text-green-light">
            Última atualização: Janeiro de 2024
          </p>
        </div>
      </section>

      {/* Terms Content */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none">
            
            {/* Introduction */}
            <div className="mb-12">
              <h2 className="font-poppins font-bold text-2xl text-soft-black mb-4">
                1. Introdução
              </h2>
              <p className="font-roboto text-gray-700 leading-relaxed">
                Bem-vindo à LiggaSST. Estes Termos de Uso ("Termos") regem o uso da nossa 
                plataforma digital que conecta empresas com profissionais de Segurança do 
                Trabalho. Ao acessar ou usar nossos serviços, você concorda em cumprir 
                estes termos.
              </p>
            </div>

            {/* Definitions */}
            <div className="mb-12">
              <h2 className="font-poppins font-bold text-2xl text-soft-black mb-4">
                2. Definições
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-poppins font-semibold text-lg text-soft-black mb-2">
                    2.1 Plataforma
                  </h3>
                  <p className="font-roboto text-gray-700">
                    Refere-se ao website, aplicativo móvel e todos os serviços oferecidos 
                    pela LiggaSST para conectar empresas e profissionais de SST.
                  </p>
                </div>
                <div>
                  <h3 className="font-poppins font-semibold text-lg text-soft-black mb-2">
                    2.2 Usuários
                  </h3>
                  <p className="font-roboto text-gray-700">
                    Pessoas físicas ou jurídicas que se cadastram na plataforma, incluindo 
                    profissionais de SST e empresas contratantes.
                  </p>
                </div>
                <div>
                  <h3 className="font-poppins font-semibold text-lg text-soft-black mb-2">
                    2.3 Serviços
                  </h3>
                  <p className="font-roboto text-gray-700">
                    Todas as funcionalidades oferecidas pela plataforma, incluindo busca, 
                    conexão, comunicação e gestão de contratos.
                  </p>
                </div>
              </div>
            </div>

            {/* User Obligations */}
            <div className="mb-12">
              <h2 className="font-poppins font-bold text-2xl text-soft-black mb-4">
                3. Obrigações dos Usuários
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-poppins font-semibold text-lg text-soft-black mb-2">
                    3.1 Informações Verdadeiras
                  </h3>
                  <p className="font-roboto text-gray-700">
                    Os usuários devem fornecer informações precisas, atualizadas e completas 
                    durante o cadastro e manter essas informações atualizadas.
                  </p>
                </div>
                <div>
                  <h3 className="font-poppins font-semibold text-lg text-soft-black mb-2">
                    3.2 Documentação
                  </h3>
                  <p className="font-roboto text-gray-700">
                    Profissionais devem apresentar documentos válidos que comprovem sua 
                    qualificação. Empresas devem fornecer documentação empresarial válida.
                  </p>
                </div>
                <div>
                  <h3 className="font-poppins font-semibold text-lg text-soft-black mb-2">
                    3.3 Conduta Adequada
                  </h3>
                  <p className="font-roboto text-gray-700">
                    Todos os usuários devem manter conduta profissional, respeitosa e ética 
                    em todas as interações na plataforma.
                  </p>
                </div>
              </div>
            </div>

            {/* Prohibited Activities */}
            <div className="mb-12 bg-red-50 p-6 rounded-xl">
              <div className="flex items-center mb-4">
                <AlertTriangle size={24} className="text-red-600 mr-3" />
                <h2 className="font-poppins font-bold text-2xl text-red-800">
                  4. Atividades Proibidas
                </h2>
              </div>
              <div className="space-y-3">
                <p className="font-roboto text-red-700">
                  • Fornecer informações falsas ou enganosas
                </p>
                <p className="font-roboto text-red-700">
                  • Usar a plataforma para atividades ilegais ou não autorizadas
                </p>
                <p className="font-roboto text-red-700">
                  • Tentar contornar medidas de segurança da plataforma
                </p>
                <p className="font-roboto text-red-700">
                  • Assediar, ameaçar ou intimidar outros usuários
                </p>
                <p className="font-roboto text-red-700">
                  • Violar direitos de propriedade intelectual
                </p>
                <p className="font-roboto text-red-700">
                  • Usar a plataforma para spam ou comunicações não solicitadas
                </p>
              </div>
            </div>

            {/* Platform Responsibilities */}
            <div className="mb-12">
              <h2 className="font-poppins font-bold text-2xl text-soft-black mb-4">
                5. Responsabilidades da Plataforma
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-poppins font-semibold text-lg text-soft-black mb-2">
                    5.1 Intermediação
                  </h3>
                  <p className="font-roboto text-gray-700">
                    A LiggaSST atua como intermediadora, facilitando a conexão entre 
                    profissionais e empresas, mas não é responsável pelos serviços 
                    prestados pelos profissionais.
                  </p>
                </div>
                <div>
                  <h3 className="font-poppins font-semibold text-lg text-soft-black mb-2">
                    5.2 Verificação
                  </h3>
                  <p className="font-roboto text-gray-700">
                    Realizamos verificações básicas de documentos, mas não garantimos 
                    a qualidade ou adequação dos serviços prestados.
                  </p>
                </div>
                <div>
                  <h3 className="font-poppins font-semibold text-lg text-soft-black mb-2">
                    5.3 Disponibilidade
                  </h3>
                  <p className="font-roboto text-gray-700">
                    Nos esforçamos para manter a plataforma disponível, mas não garantimos 
                    operação ininterrupta ou livre de erros.
                  </p>
                </div>
              </div>
            </div>

            {/* Privacy and Data */}
            <div className="mb-12 bg-green-50 p-6 rounded-xl">
              <div className="flex items-center mb-4">
                <Shield size={24} className="text-green-600 mr-3" />
                <h2 className="font-poppins font-bold text-2xl text-green-800">
                  6. Privacidade e Dados
                </h2>
              </div>
              <p className="font-roboto text-green-700">
                O tratamento de dados pessoais é regido por nossa Política de Privacidade, 
                que faz parte integrante destes Termos. Coletamos, usamos e protegemos 
                seus dados conforme descrito na política e em conformidade com a LGPD.
              </p>
            </div>

            {/* Payment and Fees */}
            <div className="mb-12">
              <h2 className="font-poppins font-bold text-2xl text-soft-black mb-4">
                7. Pagamentos e Taxas
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-poppins font-semibold text-lg text-soft-black mb-2">
                    7.1 Planos de Assinatura
                  </h3>
                  <p className="font-roboto text-gray-700">
                    Oferecemos planos gratuitos e pagos. Os valores e condições estão 
                    descritos na página de planos e podem ser alterados mediante aviso prévio.
                  </p>
                </div>
                <div>
                  <h3 className="font-poppins font-semibold text-lg text-soft-black mb-2">
                    7.2 Comissões
                  </h3>
                  <p className="font-roboto text-gray-700">
                    Podemos cobrar comissões sobre transações realizadas através da plataforma, 
                    conforme especificado nos termos de cada plano.
                  </p>
                </div>
                <div>
                  <h3 className="font-poppins font-semibold text-lg text-soft-black mb-2">
                    7.3 Reembolsos
                  </h3>
                  <p className="font-roboto text-gray-700">
                    Reembolsos são processados conforme nossa política específica, 
                    disponível na área de suporte da plataforma.
                  </p>
                </div>
              </div>
            </div>

            {/* Termination */}
            <div className="mb-12">
              <h2 className="font-poppins font-bold text-2xl text-soft-black mb-4">
                8. Rescisão
              </h2>
              <p className="font-roboto text-gray-700 mb-4">
                Qualquer parte pode encerrar o uso da plataforma a qualquer momento. 
                Reservamo-nos o direito de suspender ou encerrar contas que violem 
                estes termos.
              </p>
              <p className="font-roboto text-gray-700">
                Em caso de rescisão, os dados do usuário serão tratados conforme 
                nossa Política de Privacidade e a legislação aplicável.
              </p>
            </div>

            {/* Limitation of Liability */}
            <div className="mb-12">
              <h2 className="font-poppins font-bold text-2xl text-soft-black mb-4">
                9. Limitação de Responsabilidade
              </h2>
              <p className="font-roboto text-gray-700 mb-4">
                A LiggaSST não se responsabiliza por danos diretos, indiretos, 
                incidentais ou consequenciais decorrentes do uso da plataforma.
              </p>
              <p className="font-roboto text-gray-700">
                Nossa responsabilidade máxima é limitada ao valor pago pelo usuário 
                nos 12 meses anteriores ao evento que deu origem à reclamação.
              </p>
            </div>

            {/* Changes to Terms */}
            <div className="mb-12">
              <h2 className="font-poppins font-bold text-2xl text-soft-black mb-4">
                10. Alterações nos Termos
              </h2>
              <p className="font-roboto text-gray-700">
                Podemos modificar estes termos a qualquer momento. Alterações significativas 
                serão comunicadas com antecedência mínima de 30 dias. O uso continuado 
                da plataforma após as alterações constitui aceitação dos novos termos.
              </p>
            </div>

            {/* Governing Law */}
            <div className="mb-12">
              <h2 className="font-poppins font-bold text-2xl text-soft-black mb-4">
                11. Lei Aplicável e Foro
              </h2>
              <p className="font-roboto text-gray-700">
                Estes termos são regidos pelas leis brasileiras. Qualquer disputa 
                será resolvida no foro da comarca de São Paulo, SP, com renúncia 
                expressa a qualquer outro foro.
              </p>
            </div>

            {/* Contact */}
            <div className="bg-neutral-gray p-6 rounded-xl">
              <h2 className="font-poppins font-bold text-2xl text-soft-black mb-4">
                12. Contato
              </h2>
              <p className="font-roboto text-gray-700 mb-4">
                Para dúvidas sobre estes Termos de Uso, entre em contato conosco:
              </p>
              <div className="space-y-2 font-roboto text-gray-700">
                <p>E-mail: juridico@liggasst.com.br</p>
                <p>Telefone: (11) 99999-9999</p>
                <p>Endereço: São Paulo, SP - Brasil</p>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
};

export default TermosUso;