import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { User, Building2, GraduationCap, UserCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { digitos, validarCpfCnpj, validarCep, validarCelular } from '../../utils/dadosFaturamento';

// Tela de conclusao de cadastro para contas criadas via login social
// (Google). Essas contas nascem com status 'awaiting_completion'
// e sem papel definido: a pessoa escolhe aqui se e empresa ou profissional,
// confirma o nome de exibicao e informa os dados de cobranca (CPF/CNPJ,
// celular e endereco, desde 05/11 — funcionario nao preenche, pois
// nao assina plano). A RPC completar_cadastro valida e aprova a conta;
// ate la ela nao aparece em buscas nem usa mensagens/demandas/contratos.
const CompletarCadastro: React.FC = () => {
  const { currentUser, userData, completarCadastro } = useAuth();
  const [role, setRole] = useState<'professional' | 'company' | 'employee' | null>(null);
  const [displayName, setDisplayName] = useState(
    (userData?.nome as string) ?? (userData?.nomeEmpresa as string) ?? ''
  );
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [faturamento, setFaturamento] = useState({
    cpfCnpj: '', phone: '', postalCode: '', address: '', addressNumber: '', province: '',
  });

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
    if (role !== 'employee') {
      const doc = validarCpfCnpj(faturamento.cpfCnpj, role === 'company' ? 'company' : 'professional');
      if (doc) { setErro(doc); return; }
      const fone = validarCelular(faturamento.phone);
      if (fone) { setErro(fone); return; }
      const cep = validarCep(faturamento.postalCode);
      if (cep) { setErro(cep); return; }
      if (!faturamento.address.trim() || !faturamento.addressNumber.trim() || !faturamento.province.trim()) {
        setErro('Informe endereço, número e bairro completos.');
        return;
      }
      if (digitos(faturamento.cpfCnpj).length === 0) { setErro('Documento é obrigatório.'); return; }
    }
    setErro(null);
    setLoading(true);
    try {
      await completarCadastro(role, displayName.trim(), faturamento);
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

            {role && role !== 'employee' && (
              <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                <p className="font-roboto text-xs text-gray-500">
                  Dados de cobrança: usados apenas se você assinar um plano pago,
                  para a tela de assinatura já vir preenchida.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label={role === 'company' ? 'CNPJ' : 'CPF'}
                    placeholder={role === 'company' ? '00.000.000/0000-00' : '000.000.000-00'}
                    value={faturamento.cpfCnpj}
                    onChange={(e) => setFaturamento({ ...faturamento, cpfCnpj: e.target.value })}
                  />
                  <Input
                    label="Celular"
                    placeholder="(11) 99999-0000"
                    value={faturamento.phone}
                    onChange={(e) => setFaturamento({ ...faturamento, phone: e.target.value })}
                  />
                  <Input
                    label="CEP"
                    placeholder="00000-000"
                    value={faturamento.postalCode}
                    onChange={(e) => setFaturamento({ ...faturamento, postalCode: e.target.value })}
                  />
                  <Input
                    label="Bairro"
                    placeholder="Seu bairro"
                    value={faturamento.province}
                    onChange={(e) => setFaturamento({ ...faturamento, province: e.target.value })}
                  />
                  <Input
                    label="Endereço"
                    placeholder="Rua, avenida..."
                    value={faturamento.address}
                    onChange={(e) => setFaturamento({ ...faturamento, address: e.target.value })}
                  />
                  <Input
                    label="Número"
                    placeholder="123"
                    value={faturamento.addressNumber}
                    onChange={(e) => setFaturamento({ ...faturamento, addressNumber: e.target.value })}
                  />
                </div>
              </div>
            )}

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
