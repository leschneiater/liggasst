import React from 'react';
import { useSupabaseAuth } from '../../contexts/SupabaseAuthContext';
import Button from '../../components/ui/Button';
import { 
  User, 
  Mail, 
  Calendar, 
  LogOut, 
  Shield,
  CheckCircle,
  Clock
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user, signOut, loading } = useSupabaseAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      // Erro já tratado no contexto
    }
  };

  return (
    <div className="min-h-screen bg-neutral-gray py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-deep to-green-medium text-white p-8 rounded-2xl mb-8 shadow-lg">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
            <div className="mb-4 md:mb-0">
              <h1 className="font-poppins font-bold text-3xl mb-2">
                Dashboard
              </h1>
              <p className="font-roboto text-green-light text-lg">
                Bem-vindo à sua área protegida!
              </p>
            </div>
            <Button
              onClick={handleLogout}
              loading={loading}
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-green-deep"
              icon={LogOut}
            >
              Sair
            </Button>
          </div>
        </div>

        {/* User Info */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 mb-8">
          <h2 className="font-poppins font-semibold text-2xl text-soft-black mb-6">
            Informações do Usuário
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-4 bg-neutral-gray rounded-lg">
                <div className="w-10 h-10 bg-green-light rounded-full flex items-center justify-center">
                  <User size={20} className="text-green-deep" />
                </div>
                <div>
                  <p className="font-roboto text-sm text-gray-600">ID do Usuário</p>
                  <p className="font-poppins font-medium text-soft-black">
                    {user?.id}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-4 bg-neutral-gray rounded-lg">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Mail size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="font-roboto text-sm text-gray-600">E-mail</p>
                  <p className="font-poppins font-medium text-soft-black">
                    {user?.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-4 bg-neutral-gray rounded-lg">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Calendar size={20} className="text-purple-600" />
                </div>
                <div>
                  <p className="font-roboto text-sm text-gray-600">Criado em</p>
                  <p className="font-poppins font-medium text-soft-black">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-4 bg-neutral-gray rounded-lg">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  {user?.email_confirmed_at ? (
                    <CheckCircle size={20} className="text-green-600" />
                  ) : (
                    <Clock size={20} className="text-yellow-600" />
                  )}
                </div>
                <div>
                  <p className="font-roboto text-sm text-gray-600">Status do E-mail</p>
                  <p className={`font-poppins font-medium ${
                    user?.email_confirmed_at ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {user?.email_confirmed_at ? 'Verificado' : 'Pendente'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-4 bg-neutral-gray rounded-lg">
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Shield size={20} className="text-yellow-600" />
                </div>
                <div>
                  <p className="font-roboto text-sm text-gray-600">Último Login</p>
                  <p className="font-poppins font-medium text-soft-black">
                    {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('pt-BR') : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-4 bg-neutral-gray rounded-lg">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Calendar size={20} className="text-red-600" />
                </div>
                <div>
                  <p className="font-roboto text-sm text-gray-600">Última Atualização</p>
                  <p className="font-poppins font-medium text-soft-black">
                    {user?.updated_at ? new Date(user.updated_at).toLocaleString('pt-BR') : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
          <h2 className="font-poppins font-semibold text-2xl text-soft-black mb-6">
            Funcionalidades Disponíveis
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-green-50 rounded-lg">
              <div className="w-12 h-12 bg-green-deep rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield size={24} className="text-white" />
              </div>
              <h3 className="font-poppins font-semibold text-lg text-soft-black mb-2">
                Área Protegida
              </h3>
              <p className="font-roboto text-gray-600 text-sm">
                Esta página só é acessível para usuários autenticados
              </p>
            </div>

            <div className="text-center p-6 bg-blue-50 rounded-lg">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <User size={24} className="text-white" />
              </div>
              <h3 className="font-poppins font-semibold text-lg text-soft-black mb-2">
                Perfil do Usuário
              </h3>
              <p className="font-roboto text-gray-600 text-sm">
                Visualize e gerencie suas informações pessoais
              </p>
            </div>

            <div className="text-center p-6 bg-purple-50 rounded-lg">
              <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut size={24} className="text-white" />
              </div>
              <h3 className="font-poppins font-semibold text-lg text-soft-black mb-2">
                Logout Seguro
              </h3>
              <p className="font-roboto text-gray-600 text-sm">
                Saia da aplicação de forma segura a qualquer momento
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;