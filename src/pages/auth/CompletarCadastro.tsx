import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { User, Building2, GraduationCap, UserCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

// Tela de conclusao de cadastro para contas criadas via login social
// (Google). Essas contas nascem com status 'awaiting_completion'
// e sem papel definido: a pessoa escolhe aqui se e empresa ou profissional
// e confirma o nome de exibicao. A RPC completar_cadastro aprova a conta;
// ate la ela nao aparece em buscas nem usa mensagens/demandas/contratos.
const CompletarCadastro: React.FC = () => {
  const { currentUser, userData, completarCadastro } = useAuth();
  const [role, setRole] = useState<'professional' | 'company' | 'employee' | null>(null);
  const [displayName, setDisplayName] = useState(
    (userData?.nome as string) ?? (userData?.nomeEmpresa as string) ?? ''
  );
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!currentUser) return null;
  if (currentUser.statusVerificacao !== 'awaiting_completion') {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!role) {
      setErro('Escolha se você é empresa ou profissional.');
      return;
    }
    if (!displayName.trim()) {
      setErro('Informe o nome que aparecerá na plataforma.');
      return;
    }
    setErro(null);
    setLoading(true);
    try {
      await completarCadastro(role, displayName.trim());
      // Redirecionamento é feito no contexto de autenticação
    } catch {
      // Erro já exibido no contexto
    } finally {
      setLoading(false);
    }
  };

  const card = (
    selecionado: boolean,
    onClick: () => void,
    Icon: typeof User,
    titulo: string,
    descricao: string
  ) => (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 min-w-[200px] p-5 rounded-xl border-2 text-left transition-colors ${
        selecionado
          ? 'border-green-deep bg-green-50'
          : 'border-gray-200 bg-white hover:border-green-medium'
      }`}
    >
      <Icon size={28} className={selecionado ? 'text-green-deep' : 'text-gray-400'} />
      <p className="font-poppins font-semibold text-lg text-soft-black mt-3">{titulo}</p>
      <p className="font-roboto text-sm text-gray-600 mt-1">{descricao}</p>
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-deep via-green-medium to-green-light flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full">
        <div className="bg-white p-8 rounded-2xl shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center space-x-2 mb-4">
              <div className="w-12 h-12 bg-green-deep rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">L</span>
              </div>
              <span className="font-poppins font-bold text-2xl text-green-deep">LiggaSST</span>
            </div>
            <h2 className="font-poppins font-bold text-3xl text-soft-black">
              Complete seu cadastro
            </h2>
            <p className="font-roboto text-gray-600 mt-2">
              Você entrou com uma conta social. Para começar a usar a plataforma,
              conte como você quer participar.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              {card(
                role === 'company',
                () => setRole('company'),
                Building2,
                'Sou empresa',
                'Quero buscar profissionais de segurança do trabalho e publicar demandas.'
              )}
              {card(
                role === 'professional',
                () => setRole('professional'),
                UserCheck,
                'Sou profissional',
                'Quero oferecer meus serviços de SST e aparecer nas buscas de empresas.'
              )}
              {card(
                role === 'employee',
                () => setRole('employee'),
                GraduationCap,
                'Sou funcionário',
                'Quero fazer os treinamentos de SST liberados pela minha empresa.'
              )}
            </div>

            <Input
              label="Nome de exibição"
              icon={User}
              placeholder={role === 'company' ? 'Nome da empresa' : 'Seu nome completo'}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />

            {erro && (
              <p className="font-roboto text-sm text-red-600" role="alert">
                {erro}
              </p>
            )}

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={loading}
              className="bg-green-deep text-white hover:bg-green-medium"
            >
              Concluir cadastro
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompletarCadastro;
