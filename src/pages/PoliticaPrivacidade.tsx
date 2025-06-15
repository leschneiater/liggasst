import React from 'react';
import { Shield, Eye, Lock, Database, UserCheck } from 'lucide-react';

const PoliticaPrivacidade: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-deep to-green-medium text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Shield size={64} className="mx-auto mb-6 text-green-light" />
          <h1 className="font-poppins font-bold text-4xl md:text-5xl mb-6">
            Política de Privacidade
          </h1>
          <p className="font-roboto text-xl text-green-light">
            Última atualização: Janeiro de 2024
          </p>
        </div>
      </section>

      {/* Privacy Content */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none">
            
            {/* Introduction */}
            <div className="mb-12">
              <h2 className="font-poppins font-bold text-2xl text-soft-black mb-4">
                1. Introdução
              </h2>
              <p className="font-roboto text-gray-700 leading-relaxed">
                A LiggaSST está comprometida com a proteção da privacidade e dos dados 
                pessoais de nossos usuários. Esta Política de Privacidade descreve como 
                coletamos, usamos, armazenamos e protegemos suas informações pessoais 
                em conformidade com a Lei Geral de Proteção de Dados (LGPD).
              </p>
            </div>

            {/* Data Collection */}
            <div className="mb-12">
              <div className="flex items-center mb-4">
                <Database size={24} className="text-green-deep mr-3" />
                <h2 className="font-poppins font-bold text-2xl text-soft-black">
                  2. Dados Coletados
                </h2>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="font-poppins font-semibold text-lg text-soft-black mb-2">
                    2.1 Dados Fornecidos Diretamente
                  </h3>
                  <ul className="list-disc list-inside space-y-2 font-roboto text-gray-700">
                    <li>Informações de cadastro (nome, e-mail, telefone, CPF/CNPJ)</li>
                    <li>Dados profissionais (formação, certificações, experiência)</li>
                    <li>Informações empresariais (razão social, segmento, localização)</li>
                    <li>Documentos e certificados enviados</li>
                    <li>Mensagens e comunicações na plataforma</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-poppins font-semibold text-lg text-soft-black mb-2">
                    2.2 Dados Coletados Automaticamente
                  </h3>
                  <ul className="list-disc list-inside space-y-2 font-roboto text-gray-700">
                    <li>Informações de navegação (IP, browser, dispositivo)</li>
                    <li>Dados de uso da plataforma (páginas visitadas, tempo de sessão)</li>
                    <li>Cookies e tecnologias similares</li>
                    <li>Logs de sistema e segurança</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Purpose of Processing */}
            <div className="mb-12">
              <div className="flex items-center mb-4">
                <Eye size={24} className="text-green-deep mr-3" />
                <h2 className="font-poppins font-bold text-2xl text-soft-black">
                  3. Finalidades do Tratamento
                </h2>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="font-poppins font-semibold text-lg text-soft-black mb-2">
                    3.1 Prestação de Serviços
                  </h3>
                  <ul className="list-disc list-inside space-y-2 font-roboto text-gray-700">
                    <li>Criar e manter contas de usuário</li>
                    <li>Facilitar conexões entre empresas e profissionais</li>
                    <li>Processar transações e pagamentos</li>
                    <li>Fornecer suporte ao cliente</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-poppins font-semibold text-lg text-soft-black mb-2">
                    3.2 Melhoria dos Serviços
                  </h3>
                  <ul className="list-disc list-inside space-y-2 font-roboto text-gray-700">
                    <li>Análise de uso e performance da plataforma</li>
                    <li>Desenvolvimento de novos recursos</li>
                    <li>Personalização da experiência do usuário</li>
                    <li>Pesquisas de satisfação</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-poppins font-semibold text-lg text-soft-black mb-2">
                    3.3 Comunicação
                  </h3>
                  <ul className="list-disc list-inside space-y-2 font-roboto text-gray-700">
                    <li>Envio de notificações importantes</li>
                    <li>Newsletter e conteúdo educativo (com consentimento)</li>
                    <li>Comunicações de marketing (com consentimento)</li>
                    <li>Alertas de segurança</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Legal Basis */}
            <div className="mb-12 bg-green-50 p-6 rounded-xl">
              <div className="flex items-center mb-4">
                <UserCheck size={24} className="text-green-600 mr-3" />
                <h2 className="font-poppins font-bold text-2xl text-green-800">
                  4. Base Legal
                </h2>
              </div>
              <div className="space-y-3 font-roboto text-green-700">
                <p><strong>Execução de contrato:</strong> Para prestação dos serviços contratados</p>
                <p><strong>Consentimento:</strong> Para comunicações de marketing e cookies não essenciais</p>
                <p><strong>Interesse legítimo:</strong> Para melhoria dos serviços e segurança</p>
                <p><strong>Cumprimento de obrigação legal:</strong> Para atender exigências regulatórias</p>
              </div>
            </div>

            {/* Data Sharing */}
            <div className="mb-12">
              <h2 className="font-poppins font-bold text-2xl text-soft-black mb-4">
                5. Compartilhamento de Dados
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-poppins font-semibold text-lg text-soft-black mb-2">
                    5.1 Com Outros Usuários
                  </h3>
                  <p className="font-roboto text-gray-700">
                    Informações do perfil profissional são visíveis para empresas cadastradas 
                    e vice-versa, conforme necessário para a prestação do serviço.
                  </p>
                </div>
                <div>
                  <h3 className="font-poppins font-semibold text-lg text-soft-black mb-2">
                    5.2 Com Prestadores de Serviço
                  </h3>
                  <p className="font-roboto text-gray-700">
                    Compartilhamos dados com fornecedores que nos auxiliam na operação 
                    da plataforma (hospedagem, pagamentos, análise), sempre sob contratos 
                    de confidencialidade.
                  </p>
                </div>
                <div>
                  <h3 className="font-poppins font-semibold text-lg text-soft-black mb-2">
                    5.3 Por Exigência Legal
                  </h3>
                  <p className="font-roboto text-gray-700">
                    Podemos divulgar dados quando exigido por lei, ordem judicial ou 
                    autoridades competentes.
                  </p>
                </div>
              </div>
            </div>

            {/* Data Security */}
            <div className="mb-12">
              <div className="flex items-center mb-4">
                <Lock size={24} className="text-green-deep mr-3" />
                <h2 className="font-poppins font-bold text-2xl text-soft-black">
                  6. Segurança dos Dados
                </h2>
              </div>
              <div className="space-y-4">
                <p className="font-roboto text-gray-700">
                  Implementamos medidas técnicas e organizacionais apropriadas para 
                  proteger seus dados pessoais contra acesso não autorizado, alteração, 
                  divulgação ou destruição.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-neutral-gray p-4 rounded-lg">
                    <h4 className="font-poppins font-semibold text-soft-black mb-2">
                      Medidas Técnicas
                    </h4>
                    <ul className="list-disc list-inside space-y-1 font-roboto text-sm text-gray-700">
                      <li>Criptografia de dados</li>
                      <li>Firewalls e sistemas de detecção</li>
                      <li>Backups regulares</li>
                      <li>Monitoramento contínuo</li>
                    </ul>
                  </div>
                  <div className="bg-neutral-gray p-4 rounded-lg">
                    <h4 className="font-poppins font-semibold text-soft-black mb-2">
                      Medidas Organizacionais
                    </h4>
                    <ul className="list-disc list-inside space-y-1 font-roboto text-sm text-gray-700">
                      <li>Treinamento de funcionários</li>
                      <li>Controle de acesso</li>
                      <li>Políticas de segurança</li>
                      <li>Auditorias regulares</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Retention */}
            <div className="mb-12">
              <h2 className="font-poppins font-bold text-2xl text-soft-black mb-4">
                7. Retenção de Dados
              </h2>
              <div className="space-y-4">
                <p className="font-roboto text-gray-700">
                  Mantemos seus dados pessoais apenas pelo tempo necessário para 
                  cumprir as finalidades descritas nesta política ou conforme 
                  exigido por lei.
                </p>
                <div className="bg-neutral-gray p-4 rounded-lg">
                  <h4 className="font-poppins font-semibold text-soft-black mb-2">
                    Períodos de Retenção
                  </h4>
                  <ul className="list-disc list-inside space-y-1 font-roboto text-sm text-gray-700">
                    <li>Dados de conta ativa: Durante a vigência da conta</li>
                    <li>Dados de conta inativa: Até 2 anos após inatividade</li>
                    <li>Dados financeiros: 5 anos (exigência legal)</li>
                    <li>Logs de segurança: 6 meses</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* User Rights */}
            <div className="mb-12 bg-blue-50 p-6 rounded-xl">
              <h2 className="font-poppins font-bold text-2xl text-blue-800 mb-4">
                8. Seus Direitos
              </h2>
              <p className="font-roboto text-blue-700 mb-4">
                Conforme a LGPD, você tem os seguintes direitos sobre seus dados pessoais:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ul className="list-disc list-inside space-y-2 font-roboto text-sm text-blue-700">
                  <li>Confirmação da existência de tratamento</li>
                  <li>Acesso aos dados</li>
                  <li>Correção de dados incompletos ou inexatos</li>
                  <li>Anonimização ou eliminação</li>
                </ul>
                <ul className="list-disc list-inside space-y-2 font-roboto text-sm text-blue-700">
                  <li>Portabilidade dos dados</li>
                  <li>Eliminação dos dados</li>
                  <li>Revogação do consentimento</li>
                  <li>Oposição ao tratamento</li>
                </ul>
              </div>
            </div>

            {/* Cookies */}
            <div className="mb-12">
              <h2 className="font-poppins font-bold text-2xl text-soft-black mb-4">
                9. Cookies e Tecnologias Similares
              </h2>
              <div className="space-y-4">
                <p className="font-roboto text-gray-700">
                  Utilizamos cookies e tecnologias similares para melhorar sua 
                  experiência na plataforma. Você pode gerenciar suas preferências 
                  de cookies através das configurações do seu navegador.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-neutral-gray p-4 rounded-lg">
                    <h4 className="font-poppins font-semibold text-soft-black mb-2">
                      Essenciais
                    </h4>
                    <p className="font-roboto text-xs text-gray-700">
                      Necessários para o funcionamento básico da plataforma
                    </p>
                  </div>
                  <div className="bg-neutral-gray p-4 rounded-lg">
                    <h4 className="font-poppins font-semibold text-soft-black mb-2">
                      Funcionais
                    </h4>
                    <p className="font-roboto text-xs text-gray-700">
                      Melhoram a funcionalidade e personalização
                    </p>
                  </div>
                  <div className="bg-neutral-gray p-4 rounded-lg">
                    <h4 className="font-poppins font-semibold text-soft-black mb-2">
                      Analíticos
                    </h4>
                    <p className="font-roboto text-xs text-gray-700">
                      Ajudam a entender como você usa a plataforma
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Changes to Policy */}
            <div className="mb-12">
              <h2 className="font-poppins font-bold text-2xl text-soft-black mb-4">
                10. Alterações nesta Política
              </h2>
              <p className="font-roboto text-gray-700">
                Podemos atualizar esta Política de Privacidade periodicamente. 
                Alterações significativas serão comunicadas através da plataforma 
                ou por e-mail. Recomendamos que você revise esta política regularmente.
              </p>
            </div>

            {/* Contact DPO */}
            <div className="bg-green-50 p-6 rounded-xl">
              <h2 className="font-poppins font-bold text-2xl text-green-800 mb-4">
                11. Contato - Encarregado de Dados
              </h2>
              <p className="font-roboto text-green-700 mb-4">
                Para exercer seus direitos ou esclarecer dúvidas sobre esta política, 
                entre em contato com nosso Encarregado de Proteção de Dados:
              </p>
              <div className="space-y-2 font-roboto text-green-700">
                <p>E-mail: dpo@liggasst.com.br</p>
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

export default PoliticaPrivacidade;