import React from 'react';
import { 
  Database, 
  Zap, 
  Shield, 
  Clock,
  RefreshCw,
  Server,
  Globe,
  CheckCircle,
  AlertTriangle,
  Settings
} from 'lucide-react';

const SobreCache: React.FC = () => {
  const cacheTypes = [
    {
      icon: Globe,
      title: 'Cache do Navegador',
      description: 'Armazena arquivos estáticos como CSS, JavaScript e imagens localmente no seu dispositivo.',
      benefits: ['Carregamento mais rápido', 'Reduz uso de dados', 'Funciona offline parcialmente']
    },
    {
      icon: Server,
      title: 'Cache do Servidor',
      description: 'Dados frequentemente acessados são armazenados em memória para resposta mais rápida.',
      benefits: ['Menor latência', 'Reduz carga no banco', 'Melhora performance geral']
    },
    {
      icon: Database,
      title: 'Cache de Dados',
      description: 'Informações de perfis e buscas são temporariamente armazenadas para acesso rápido.',
      benefits: ['Busca instantânea', 'Sincronização eficiente', 'Experiência fluida']
    }
  ];

  const managementTips = [
    {
      icon: RefreshCw,
      title: 'Atualização Automática',
      description: 'O cache é atualizado automaticamente quando detectamos mudanças importantes.',
      action: 'Nenhuma ação necessária'
    },
    {
      icon: Settings,
      title: 'Limpeza Manual',
      description: 'Você pode limpar o cache manualmente se encontrar problemas de carregamento.',
      action: 'Ctrl+F5 ou Cmd+Shift+R'
    },
    {
      icon: Clock,
      title: 'Expiração Inteligente',
      description: 'Diferentes tipos de dados têm tempos de expiração otimizados.',
      action: 'Gerenciado automaticamente'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-deep to-green-medium text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Database size={64} className="mx-auto mb-6 text-green-light" />
          <h1 className="font-poppins font-bold text-4xl md:text-5xl mb-6">
            Sobre o Cache
          </h1>
          <p className="font-roboto text-xl text-green-light">
            Entenda como otimizamos a performance da LiggaSST através do sistema de cache
          </p>
        </div>
      </section>

      {/* What is Cache */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-poppins font-bold text-3xl md:text-4xl text-soft-black mb-6">
              O que é Cache?
            </h2>
            <p className="font-roboto text-lg text-gray-600 leading-relaxed">
              Cache é uma tecnologia que armazena temporariamente dados frequentemente acessados 
              em locais de acesso mais rápido. Na LiggaSST, utilizamos diferentes tipos de cache 
              para garantir que você tenha a melhor experiência possível, com carregamento rápido 
              e navegação fluida.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap size={32} className="text-blue-600" />
              </div>
              <h3 className="font-poppins font-semibold text-xl text-soft-black mb-3">
                Velocidade
              </h3>
              <p className="font-roboto text-gray-600">
                Reduz significativamente o tempo de carregamento das páginas
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield size={32} className="text-green-600" />
              </div>
              <h3 className="font-poppins font-semibold text-xl text-soft-black mb-3">
                Eficiência
              </h3>
              <p className="font-roboto text-gray-600">
                Otimiza o uso de recursos e reduz o consumo de dados
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock size={32} className="text-purple-600" />
              </div>
              <h3 className="font-poppins font-semibold text-xl text-soft-black mb-3">
                Disponibilidade
              </h3>
              <p className="font-roboto text-gray-600">
                Permite acesso a conteúdo mesmo com conexão instável
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Types of Cache */}
      <section className="py-20 bg-neutral-gray">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-poppins font-bold text-3xl md:text-4xl text-soft-black mb-4">
              Tipos de Cache na LiggaSST
            </h2>
            <p className="font-roboto text-xl text-gray-600">
              Utilizamos múltiplas camadas de cache para otimizar sua experiência
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {cacheTypes.map((type, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="w-12 h-12 bg-green-light rounded-lg flex items-center justify-center mb-4">
                  <type.icon size={24} className="text-green-deep" />
                </div>
                <h3 className="font-poppins font-semibold text-xl text-soft-black mb-3">
                  {type.title}
                </h3>
                <p className="font-roboto text-gray-600 mb-4">
                  {type.description}
                </p>
                <div className="space-y-2">
                  {type.benefits.map((benefit, benefitIndex) => (
                    <div key={benefitIndex} className="flex items-center">
                      <CheckCircle size={16} className="text-green-medium mr-2 flex-shrink-0" />
                      <span className="font-roboto text-sm text-gray-700">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cache Management */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-poppins font-bold text-3xl md:text-4xl text-soft-black mb-4">
              Gerenciamento de Cache
            </h2>
            <p className="font-roboto text-xl text-gray-600">
              Como mantemos o cache otimizado e atualizado
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {managementTips.map((tip, index) => (
              <div key={index} className="bg-neutral-gray p-6 rounded-xl">
                <div className="w-12 h-12 bg-green-deep rounded-lg flex items-center justify-center mb-4">
                  <tip.icon size={24} className="text-white" />
                </div>
                <h3 className="font-poppins font-semibold text-lg text-soft-black mb-3">
                  {tip.title}
                </h3>
                <p className="font-roboto text-gray-600 mb-3">
                  {tip.description}
                </p>
                <div className="bg-green-light bg-opacity-20 p-3 rounded-lg">
                  <span className="font-roboto text-sm font-medium text-green-deep">
                    {tip.action}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cache in Practice */}
      <section className="py-20 bg-green-deep text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-poppins font-bold text-3xl md:text-4xl mb-6">
              Cache na Prática
            </h2>
            <p className="font-roboto text-xl text-green-light">
              Veja como o cache melhora sua experiência na LiggaSST
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-green-medium bg-opacity-30 p-6 rounded-xl">
              <h3 className="font-poppins font-semibold text-xl mb-4">
                Busca de Profissionais
              </h3>
              <ul className="space-y-2 font-roboto text-green-light">
                <li>• Resultados aparecem instantaneamente</li>
                <li>• Filtros são aplicados em tempo real</li>
                <li>• Perfis carregam rapidamente</li>
                <li>• Fotos e documentos são pré-carregados</li>
              </ul>
            </div>

            <div className="bg-green-medium bg-opacity-30 p-6 rounded-xl">
              <h3 className="font-poppins font-semibold text-xl mb-4">
                Dashboard e Perfis
              </h3>
              <ul className="space-y-2 font-roboto text-green-light">
                <li>• Dados pessoais carregam imediatamente</li>
                <li>• Estatísticas são atualizadas em tempo real</li>
                <li>• Mensagens sincronizam automaticamente</li>
                <li>• Navegação entre páginas é fluida</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Troubleshooting */}
      <section className="py-20 bg-neutral-gray">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-poppins font-bold text-3xl md:text-4xl text-soft-black mb-4">
              Problemas com Cache?
            </h2>
            <p className="font-roboto text-xl text-gray-600">
              Soluções rápidas para os problemas mais comuns
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border-l-4 border-yellow-400">
              <div className="flex items-start">
                <AlertTriangle size={24} className="text-yellow-600 mr-4 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-poppins font-semibold text-lg text-soft-black mb-2">
                    Página não carrega corretamente
                  </h3>
                  <p className="font-roboto text-gray-600 mb-3">
                    Se você está vendo informações desatualizadas ou a página não carrega como esperado.
                  </p>
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <p className="font-roboto text-sm text-yellow-800">
                      <strong>Solução:</strong> Pressione Ctrl+F5 (Windows) ou Cmd+Shift+R (Mac) para forçar a atualização
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border-l-4 border-blue-400">
              <div className="flex items-start">
                <RefreshCw size={24} className="text-blue-600 mr-4 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-poppins font-semibold text-lg text-soft-black mb-2">
                    Dados não sincronizam
                  </h3>
                  <p className="font-roboto text-gray-600 mb-3">
                    Se suas alterações não aparecem ou dados parecem desatualizados.
                  </p>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="font-roboto text-sm text-blue-800">
                      <strong>Solução:</strong> Aguarde alguns segundos e recarregue a página, ou limpe o cache do navegador
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border-l-4 border-green-400">
              <div className="flex items-start">
                <CheckCircle size={24} className="text-green-600 mr-4 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-poppins font-semibold text-lg text-soft-black mb-2">
                    Limpeza completa do cache
                  </h3>
                  <p className="font-roboto text-gray-600 mb-3">
                    Para problemas persistentes, você pode limpar completamente o cache.
                  </p>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="font-roboto text-sm text-green-800">
                      <strong>Solução:</strong> Acesse as configurações do navegador {'>'} Privacidade {'>'} Limpar dados de navegação
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Support */}
      <section className="py-20 bg-green-deep text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-poppins font-bold text-3xl md:text-4xl mb-6">
            Ainda com Problemas?
          </h2>
          <p className="font-roboto text-xl text-green-light mb-8">
            Nossa equipe de suporte está pronta para ajudar você
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:suporte@liggasst.com.br"
              className="px-8 py-3 bg-green-light text-green-deep rounded-lg hover:bg-white transition-colors duration-200 font-roboto font-medium"
            >
              Enviar E-mail
            </a>
            <a
              href="https://wa.me/5511999999999"
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

export default SobreCache;