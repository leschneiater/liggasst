import React from 'react';
import { FileText } from 'lucide-react';

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
            Última atualização: 4 de novembro de 2026
          </p>
        </div>
      </section>

      {/* Terms Content */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none">

                <h2 className="font-poppins font-bold text-2xl text-soft-black mb-4 mt-10">1. Introdução</h2>
                <p className="font-roboto text-gray-700 mb-4 leading-relaxed">Bem-vindo à LiggaSST. Estes Termos de Uso ("Termos") regem o uso da nossa plataforma digital que conecta empresas a profissionais de Segurança do Trabalho. Ao acessar ou usar nossos serviços, você concorda em cumprir estes termos.</p>

                <h2 className="font-poppins font-bold text-2xl text-soft-black mb-4 mt-10">2. Definições</h2>
                <p className="font-roboto text-gray-700 mb-4 leading-relaxed"><strong>2.1 Plataforma.</strong> Refere-se ao website, aplicativo móvel e todos os serviços oferecidos pela LiggaSST para conectar empresas e profissionais de SST.</p>
                <p className="font-roboto text-gray-700 mb-4 leading-relaxed"><strong>2.2 Usuários.</strong> Pessoas físicas ou jurídicas que se cadastram na plataforma, incluindo profissionais de SST e empresas contratantes.</p>
                <p className="font-roboto text-gray-700 mb-4 leading-relaxed"><strong>2.3 Serviços.</strong> Todas as funcionalidades oferecidas pela plataforma, incluindo busca, conexão, comunicação, gestão de contratos, conteúdo informativo (Radar TST) e capacitações e treinamentos.</p>

                <h2 className="font-poppins font-bold text-2xl text-soft-black mb-4 mt-10">3. Obrigações dos Usuários</h2>
                <p className="font-roboto text-gray-700 mb-4 leading-relaxed"><strong>3.1 Informações verdadeiras.</strong> Os usuários devem fornecer informações precisas, atualizadas e completas durante o cadastro e manter essas informações atualizadas.</p>
                <p className="font-roboto text-gray-700 mb-4 leading-relaxed"><strong>3.2 Documentação.</strong> Profissionais devem apresentar documentos válidos que comprovem sua qualificação. Empresas devem fornecer documentação empresarial válida.</p>
                <p className="font-roboto text-gray-700 mb-4 leading-relaxed"><strong>3.3 Conduta adequada.</strong> Todos os usuários devem manter conduta profissional, respeitosa e ética em todas as interações na plataforma.</p>

                <h2 className="font-poppins font-bold text-2xl text-soft-black mb-4 mt-10">4. Atividades Proibidas</h2>
                <ul className="list-disc pl-6 mb-4 font-roboto text-gray-700 space-y-1">
                    <li>Fornecer informações falsas ou enganosas;</li>
                    <li>Usar a plataforma para atividades ilegais ou não autorizadas;</li>
                    <li>Tentar contornar medidas de segurança da plataforma;</li>
                    <li>Assediar, ameaçar ou intimidar outros usuários;</li>
                    <li>Violar direitos de propriedade intelectual;</li>
                    <li>Usar a plataforma para spam ou comunicações não solicitadas.</li>
                </ul>

                <h2 className="font-poppins font-bold text-2xl text-soft-black mb-4 mt-10">5. Responsabilidades da Plataforma</h2>
                <p className="font-roboto text-gray-700 mb-4 leading-relaxed"><strong>5.1 Intermediação.</strong> A LiggaSST atua como intermediadora, facilitando a conexão entre profissionais e empresas, mas não é responsável pelos serviços prestados pelos profissionais.</p>
                <p className="font-roboto text-gray-700 mb-4 leading-relaxed"><strong>5.2 Verificação.</strong> Realizamos verificações básicas de documentos, mas não garantimos a qualidade ou adequação dos serviços prestados.</p>
                <p className="font-roboto text-gray-700 mb-4 leading-relaxed"><strong>5.3 Disponibilidade.</strong> Nos esforçamos para manter a plataforma disponível, mas não garantimos operação ininterrupta ou livre de erros.</p>

                <h2 className="font-poppins font-bold text-2xl text-soft-black mb-4 mt-10">6. Mensagens entre Usuários</h2>
                <p className="font-roboto text-gray-700 mb-4 leading-relaxed"><strong>6.1 Quem pode conversar.</strong> Empresas e profissionais com cadastro aprovado podem iniciar conversas entre si pela plataforma. As mensagens devem ter finalidade profissional, relacionada à contratação e à prestação de serviços de Segurança do Trabalho.</p>
                <p className="font-roboto text-gray-700 mb-4 leading-relaxed"><strong>6.2 Conduta nas mensagens.</strong> As regras de conduta (item 3.3) e as atividades proibidas (item 4) valem também para as mensagens trocadas na plataforma.</p>
                <p className="font-roboto text-gray-700 mb-4 leading-relaxed"><strong>6.3 Bloqueio.</strong> Qualquer usuário pode bloquear outro usuário. O bloqueio impede o envio de novas mensagens entre os dois, nos dois sentidos, e não apaga o histórico da conversa. O usuário bloqueado não é informado sobre quem realizou o bloqueio.</p>
                <p className="font-roboto text-gray-700 mb-4 leading-relaxed"><strong>6.4 Denúncias.</strong> O usuário pode denunciar à administração uma mensagem ou conduta inadequada. A administração analisa cada denúncia e registra seu andamento. Esse registro não é, por si só, uma medida sobre contas: suspensões ou encerramentos seguem a seção de Rescisão destes Termos.</p>

                <h2 className="font-poppins font-bold text-2xl text-soft-black mb-4 mt-10">7. Privacidade e Dados</h2>
                <p className="font-roboto text-gray-700 mb-4 leading-relaxed">O tratamento de dados pessoais é regido por nossa Política de Privacidade, que faz parte integrante destes Termos. Coletamos, usamos e protegemos seus dados conforme descrito na política e em conformidade com a LGPD.</p>

                <h2 className="font-poppins font-bold text-2xl text-soft-black mb-4 mt-10">8. Planos, Pagamento e Cancelamento</h2>
                <p className="font-roboto text-gray-700 mb-4 leading-relaxed"><strong>8.1 Planos.</strong> A plataforma oferece plano gratuito e planos pagos por assinatura mensal, com valores e benefícios descritos na página de planos. Os limites do plano gratuito (até 3 demandas ativas para empresas e até 5 contatos novos iniciados por mês e até 5 certificados visíveis no perfil para profissionais) passam a valer a partir do lançamento dos planos pagos, com aviso prévio aos usuários já cadastrados, e nenhum conteúdo existente é apagado por causa deles. Os planos pagos incluem, a partir do lançamento, destaque na busca e na vitrine, acesso ao Radar TST e à Capacitação, entre outros benefícios descritos na página de planos. A plataforma pode exibir publicidade dentro das áreas logadas de contas do plano gratuito; assinantes de planos pagos não veem publicidade e nenhuma publicidade é exibida nas páginas públicas do site.</p>
                <p className="font-roboto text-gray-700 mb-4 leading-relaxed"><strong>8.2 Cobrança.</strong> A assinatura é cobrada mensalmente, de forma recorrente, no cartão de crédito informado pelo usuário. O processamento do pagamento é feito pelo parceiro Asaas (checkout), que não é o vendedor do serviço. A plataforma não cobra comissões sobre transações entre usuários. Não há período de teste gratuito: a primeira mensalidade é cobrada no ato da contratação, e as seguintes a cada mês na mesma data.</p>
                <p className="font-roboto text-gray-700 mb-4 leading-relaxed"><strong>8.3 Cancelamento.</strong> Você pode cancelar a assinatura a qualquer momento, pelo próprio aplicativo, sem multa e sem período de fidelidade. Após o cancelamento, o acesso aos benefícios pagos permanece até o fim do período já pago e nenhuma cobrança de períodos seguintes é realizada.</p>
                <p className="font-roboto text-gray-700 mb-4 leading-relaxed"><strong>8.4 Arrependimento e reembolsos.</strong> Nos termos do art. 49 do Código de Defesa do Consumidor, você pode se arrepender da contratação em até 7 (sete) dias a contar da contratação, com devolução integral dos valores pagos. Falhas do serviço e cobranças indevidas podem ser relatadas pelo canal de atendimento indicado no item 13 para análise e correção, com devolução dos valores quando cabível. Nada nestes Termos afasta direitos irrenunciáveis previstos em lei.</p>

                <h2 className="font-poppins font-bold text-2xl text-soft-black mb-4 mt-10">9. Rescisão</h2>
                <p className="font-roboto text-gray-700 mb-4 leading-relaxed">Qualquer parte pode encerrar o uso da plataforma a qualquer momento. Reservamo-nos o direito de suspender ou encerrar contas que violem estes termos. Em caso de rescisão, os dados do usuário serão tratados conforme nossa Política de Privacidade e a legislação aplicável.</p>

                <h2 className="font-poppins font-bold text-2xl text-soft-black mb-4 mt-10">10. Limitação de Responsabilidade</h2>
                <p className="font-roboto text-gray-700 mb-4 leading-relaxed"><strong>10.1 O que a LiggaSST responde.</strong> A LiggaSST responde pelo funcionamento da própria plataforma e pelos serviços que ela presta diretamente, como cadastro, mensagens, cobrança da assinatura e cancelamento, nos termos da legislação aplicável, incluindo o Código de Defesa do Consumidor quando couber.</p>
                <p className="font-roboto text-gray-700 mb-4 leading-relaxed"><strong>10.2 Serviços entre usuários.</strong> Como a LiggaSST apenas conecta profissionais e empresas (item 5.1), os serviços contratados entre eles são de responsabilidade de quem os presta e de quem os contrata.</p>
                <p className="font-roboto text-gray-700 mb-4 leading-relaxed"><strong>10.3 Disponibilidade.</strong> A plataforma pode ficar indisponível por manutenção ou falhas, conforme o item 5.3.</p>
                <p className="font-roboto text-gray-700 mb-4 leading-relaxed"><strong>10.4 Direitos preservados.</strong> Nada nestes Termos exclui ou limita responsabilidades que a lei não permita excluir ou limitar, nem afasta direitos irrenunciáveis previstos em lei.</p>
                <p className="font-roboto text-gray-700 mb-4 leading-relaxed"><strong>10.5 Atendimento.</strong> Para relatar falhas ou cobranças indevidas, use o canal do item 13.</p>

                <h2 className="font-poppins font-bold text-2xl text-soft-black mb-4 mt-10">11. Alterações nos Termos</h2>
                <p className="font-roboto text-gray-700 mb-4 leading-relaxed">Podemos modificar estes termos a qualquer momento. Alterações significativas serão comunicadas com antecedência mínima de 30 dias. O uso continuado da plataforma após as alterações constitui aceitação dos novos termos.</p>

                <h2 className="font-poppins font-bold text-2xl text-soft-black mb-4 mt-10">12. Lei Aplicável e Foro</h2>
                <p className="font-roboto text-gray-700 mb-4 leading-relaxed">Estes termos são regidos pelas leis brasileiras. Para usuários consumidores, o foro competente é o do domicílio do usuário, nos termos da lei. Para as demais disputas, fica eleito o foro da comarca de São Paulo, SP.</p>

                <h2 className="font-poppins font-bold text-2xl text-soft-black mb-4 mt-10">13. Identificação e Atendimento</h2>
                <p className="font-roboto text-gray-700 mb-4 leading-relaxed">Canal oficial de atendimento, inclusive para relatar falhas do serviço e cobranças indevidas:</p>
                <ul className="list-disc pl-6 mb-4 font-roboto text-gray-700 space-y-1">
                    <li>E-mail: contato@liggasst.com.br</li>
                    <li>Telefone/WhatsApp: (11) 98886-1490</li>
                </ul>
                <p className="font-roboto text-gray-700 mb-4 leading-relaxed">O processamento do pagamento é feito pelo parceiro Asaas (checkout), que não é o vendedor do serviço; isso não substitui a identificação do fornecedor.</p>
            
          </div>
        </div>
      </section>
    </div>
  );
};

export default TermosUso;
