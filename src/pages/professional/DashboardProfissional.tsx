import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  User, 
  FileText, 
  MessageSquare, 
  Upload,
  Crown,
  CheckCircle,
  Plus
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useMessagingDisponivel } from '../../hooks/useMessagingDisponivel';
import Button from '../../components/ui/Button';

const DashboardProfissional: React.FC = () => {
  const { userData } = useAuth();
  const { disponivel: msgDisponivel } = useMessagingDisponivel();
  const [currentPlan] = useState('gratuito');

  return (
    <div className="min-h-screen bg-neutral-gray py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Bloco de Boas-vindas */}
        <div className="bg-gradient-to-r from-green-deep to-green-medium text-white p-8 rounded-2xl mb-8 shadow-lg">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
            <div className="mb-4 md:mb-0">
              <h1 className="font-poppins font-bold text-3xl mb-2">
                Olá, {userData?.nome || 'Profissional'}! Bem-vindo ao seu painel LiggaSST.
              </h1>
              <p className="font-roboto text-green-light text-lg">
                Gerencie seu perfil profissional em um só lugar.
              </p>
            </div>
            <div className="bg-white bg-opacity-20 p-4 rounded-xl">
              <div className="flex items-center space-x-2 mb-2">
                <Crown size={20} className="text-green-light" />
                <span className="font-poppins font-semibold text-green-light">
                  Plano {currentPlan === 'gratuito' ? 'Gratuito' : 'Profissional'}
                </span>
              </div>
              <Button 
                as={Link}
                to="/assinatura-profissional"
                size="sm"
                className="bg-green-light text-green-deep hover:bg-white"
              >
                Ver planos
              </Button>
            </div>
          </div>
        </div>

        {/* Área de Ações Rápidas */}
        <div className="mb-8">
          <h2 className="font-poppins font-semibold text-xl text-soft-black mb-4">
            Ações Rápidas
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              as={Link}
              to="/perfil-profissional"
              variant="outline"
              className="h-24 flex-col bg-white hover:bg-green-light hover:border-green-medium"
            >
              <User size={24} className="mb-2 text-green-deep" />
              <span className="text-xs font-medium">Atualizar Perfil</span>
            </Button>
            <Button
              as={Link}
              to="/certificados"
              variant="outline"
              className="h-24 flex-col bg-white hover:bg-green-light hover:border-green-medium"
            >
              <Upload size={24} className="mb-2 text-green-deep" />
              <span className="text-xs font-medium">Certificados</span>
            </Button>
            <Button
              as={Link}
              to="/contratos-profissional"
              variant="outline"
              className="h-24 flex-col bg-white hover:bg-green-light hover:border-green-medium"
            >
              <FileText size={24} className="mb-2 text-green-deep" />
              <span className="text-xs font-medium">Histórico Contratos</span>
            </Button>
            {msgDisponivel && (
            <Button
              as={Link}
              to="/mensagens-profissional"
              variant="outline"
              className="h-24 flex-col bg-white hover:bg-green-light hover:border-green-medium"
            >
              <MessageSquare size={24} className="mb-2 text-green-deep" />
              <span className="text-xs font-medium">Central Mensagens</span>
            </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna Principal */}
          <div className="lg:col-span-2 space-y-8">
            {/* Meu Status na Plataforma */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="font-poppins font-semibold text-xl text-soft-black mb-6">
                Meu Status na Plataforma
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cadastro */}
                <div className="bg-neutral-gray p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-roboto font-medium text-soft-black">Cadastro</span>
                    <div className="flex items-center space-x-1">
                      <CheckCircle size={16} className="text-green-600" />
                      <span className="font-roboto text-sm text-green-600">
                        Ativo
                      </span>
                    </div>
                  </div>
                  <p className="font-roboto text-xs text-gray-600">
                    A verificação de documentos ainda não está disponível na plataforma.
                  </p>
                </div>

                {/* Plano */}
                <div className="bg-neutral-gray p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-roboto font-medium text-soft-black">Plano</span>
                    <span className="font-poppins font-bold text-green-deep">Gratuito</span>
                  </div>
                  <p className="font-roboto text-xs text-gray-600">
                    Os planos pagos ainda não estão disponíveis. A proposta de valores e benefícios está na página de assinatura.
                  </p>
                </div>
              </div>
            </div>

            {/* Áreas em implantação */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="font-poppins font-semibold text-xl text-soft-black mb-4">
                Em implantação
              </h2>
              <p className="font-roboto text-sm text-gray-600">
                Contratos, avaliações, busca de empresas e envio de certificados ainda estão sendo preparados. Quando cada área estiver ativa, ela aparecerá aqui no seu painel, sem dados de exemplo.
              </p>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Certificados */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-poppins font-semibold text-lg text-soft-black mb-4">
                Certificados
              </h3>
              <p className="font-roboto text-sm text-gray-600 mb-3">
                O envio de certificados e documentos ainda está sendo preparado.
              </p>
              <Button 
                as={Link}
                to="/certificados"
                size="sm" 
                variant="outline"
                fullWidth
              >
                Ver página de Certificados
              </Button>
            </div>

            {/* Minha Assinatura */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-poppins font-semibold text-lg text-soft-black mb-4">
                Minha Assinatura
              </h3>
              
              <div className="bg-neutral-gray p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Crown size={16} className="text-green-deep" />
                  <span className="font-poppins font-medium text-soft-black">
                    Plano {currentPlan === 'gratuito' ? 'Gratuito' : 'Profissional'}
                  </span>
                </div>
                <p className="font-roboto text-xs text-gray-600 mb-3">
                  Os planos pagos ainda não estão disponíveis para assinatura.
                </p>
                <Button 
                  as={Link}
                  to="/assinatura-profissional"
                  size="sm" 
                  fullWidth
                >
                  Ver proposta de planos
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardProfissional;
