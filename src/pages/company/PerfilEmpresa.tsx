import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  FileText,
  Users,
  Save,
  Camera,
  User
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import toast from 'react-hot-toast';

interface CompanyProfileFormData {
  nomeEmpresa: string;
  cnpj: string;
  email: string;
  telefone: string;
  cep: string;
  cidade: string;
  estado: string;
  endereco: string;
  segmento: string;
  numeroFuncionarios: string;
  nomeResponsavel: string;
  cargoResponsavel: string;
  emailResponsavel: string;
  telefoneResponsavel: string;
  descricaoEmpresa: string;
  necessidades: string[];
}

const PerfilEmpresa: React.FC = () => {
  const { userData, updateUserProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dados-empresa');
  
  const { register, handleSubmit, formState: { errors } } = useForm<CompanyProfileFormData>({
    defaultValues: userData
  });

  const segmentos = [
    'Indústria Alimentícia',
    'Indústria Automobilística',
    'Indústria Química',
    'Indústria Metalúrgica',
    'Construção Civil',
    'Mineração',
    'Petróleo e Gás',
    'Saúde',
    'Educação',
    'Tecnologia',
    'Comércio',
    'Serviços',
    'Agronegócio',
    'Logística e Transporte',
    'Outro'
  ];

  const funcionarios = [
    '1-10',
    '11-50',
    '51-100',
    '101-500',
    '501-1000',
    'Mais de 1000'
  ];

  const necessidades = [
    'PCMSO - Programa de Controle Médico de Saúde Ocupacional',
    'PPRA - Programa de Prevenção de Riscos Ambientais',
    'LTCAT - Laudo Técnico de Condições Ambientais do Trabalho',
    'PPP - Perfil Profissiográfico Previdenciário',
    'Treinamentos de Segurança',
    'Consultoria em SST',
    'Auditoria de Segurança',
    'Perícia Técnica'
  ];

  const estados = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  const onSubmit = async (data: CompanyProfileFormData) => {
    setLoading(true);
    try {
      await updateUserProfile(data);
    } catch (error) {
      toast.error('Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'dados-empresa', label: 'Dados da Empresa', icon: Building2 },
    { id: 'responsavel', label: 'Responsável', icon: User },
    { id: 'necessidades', label: 'Necessidades', icon: FileText }
  ];

  return (
    <div className="min-h-screen bg-neutral-gray py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-poppins font-bold text-3xl text-soft-black mb-2">
            Perfil da Empresa
          </h1>
          <p className="font-roboto text-gray-600">
            Mantenha as informações da sua empresa sempre atualizadas
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              {/* Company Logo */}
              <div className="text-center mb-6">
                <div className="relative inline-block">
                  <div className="w-24 h-24 bg-green-light rounded-lg flex items-center justify-center mx-auto mb-3">
                    <span className="font-poppins font-bold text-2xl text-green-deep">
                      {userData?.nomeEmpresa?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'E'}
                    </span>
                  </div>
                  <button className="absolute bottom-0 right-0 w-8 h-8 bg-green-deep rounded-full flex items-center justify-center text-white hover:bg-green-medium transition-colors">
                    <Camera size={16} />
                  </button>
                </div>
                <h3 className="font-poppins font-semibold text-lg text-soft-black">
                  {userData?.nomeEmpresa || 'Nome da Empresa'}
                </h3>
                <p className="font-roboto text-sm text-gray-600">
                  {userData?.segmento || 'Segmento'}
                </p>
              </div>

              {/* Navigation */}
              <nav className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 rounded-lg font-roboto text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'bg-green-deep text-white'
                        : 'text-gray-700 hover:bg-green-light'
                    }`}
                  >
                    <tab.icon size={16} className="mr-3" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Dados da Empresa */}
                {activeTab === 'dados-empresa' && (
                  <div className="space-y-6">
                    <h2 className="font-poppins font-semibold text-xl text-soft-black mb-4">
                      Dados da Empresa
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Nome da Empresa"
                        icon={Building2}
                        error={errors.nomeEmpresa?.message}
                        {...register('nomeEmpresa', { required: 'Nome da empresa é obrigatório' })}
                      />
                      <Input
                        label="CNPJ"
                        icon={FileText}
                        error={errors.cnpj?.message}
                        {...register('cnpj', { required: 'CNPJ é obrigatório' })}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="E-mail da Empresa"
                        type="email"
                        icon={Mail}
                        error={errors.email?.message}
                        {...register('email', { required: 'E-mail é obrigatório' })}
                      />
                      <Input
                        label="Telefone"
                        icon={Phone}
                        error={errors.telefone?.message}
                        {...register('telefone', { required: 'Telefone é obrigatório' })}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input
                        label="CEP"
                        icon={MapPin}
                        error={errors.cep?.message}
                        {...register('cep', { required: 'CEP é obrigatório' })}
                      />
                      <Input
                        label="Cidade"
                        error={errors.cidade?.message}
                        {...register('cidade', { required: 'Cidade é obrigatória' })}
                      />
                      <div>
                        <label className="block font-roboto font-medium text-soft-black text-sm mb-1">
                          Estado
                        </label>
                        <select
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-deep focus:border-green-deep"
                          {...register('estado', { required: 'Estado é obrigatório' })}
                        >
                          <option value="">Selecione</option>
                          {estados.map((estado) => (
                            <option key={estado} value={estado}>{estado}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <Input
                      label="Endereço Completo"
                      error={errors.endereco?.message}
                      {...register('endereco', { required: 'Endereço é obrigatório' })}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-roboto font-medium text-soft-black text-sm mb-1">
                          Segmento
                        </label>
                        <select
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-deep focus:border-green-deep"
                          {...register('segmento', { required: 'Segmento é obrigatório' })}
                        >
                          <option value="">Selecione o segmento</option>
                          {segmentos.map((segmento) => (
                            <option key={segmento} value={segmento}>{segmento}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-roboto font-medium text-soft-black text-sm mb-1">
                          Número de Funcionários
                        </label>
                        <select
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-deep focus:border-green-deep"
                          {...register('numeroFuncionarios', { required: 'Número de funcionários é obrigatório' })}
                        >
                          <option value="">Selecione</option>
                          {funcionarios.map((funcionario) => (
                            <option key={funcionario} value={funcionario}>{funcionario}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block font-roboto font-medium text-soft-black text-sm mb-1">
                        Descrição da Empresa
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Descreva a empresa, suas atividades e cultura..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-deep focus:border-green-deep"
                        {...register('descricaoEmpresa')}
                      />
                    </div>
                  </div>
                )}

                {/* Responsável */}
                {activeTab === 'responsavel' && (
                  <div className="space-y-6">
                    <h2 className="font-poppins font-semibold text-xl text-soft-black mb-4">
                      Responsável pela Conta
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Nome do Responsável"
                        icon={User}
                        error={errors.nomeResponsavel?.message}
                        {...register('nomeResponsavel', { required: 'Nome do responsável é obrigatório' })}
                      />
                      <Input
                        label="Cargo"
                        error={errors.cargoResponsavel?.message}
                        {...register('cargoResponsavel', { required: 'Cargo é obrigatório' })}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="E-mail do Responsável"
                        type="email"
                        icon={Mail}
                        error={errors.emailResponsavel?.message}
                        {...register('emailResponsavel', { required: 'E-mail do responsável é obrigatório' })}
                      />
                      <Input
                        label="Telefone do Responsável"
                        icon={Phone}
                        error={errors.telefoneResponsavel?.message}
                        {...register('telefoneResponsavel', { required: 'Telefone do responsável é obrigatório' })}
                      />
                    </div>
                  </div>
                )}

                {/* Necessidades */}
                {activeTab === 'necessidades' && (
                  <div className="space-y-6">
                    <h2 className="font-poppins font-semibold text-xl text-soft-black mb-4">
                      Principais Necessidades em SST
                    </h2>

                    <div>
                      <label className="block font-roboto font-medium text-soft-black text-sm mb-3">
                        Selecione os serviços que sua empresa mais necessita:
                      </label>
                      <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto">
                        {necessidades.map((necessidade) => (
                          <label key={necessidade} className="flex items-center">
                            <input
                              type="checkbox"
                              value={necessidade}
                              {...register('necessidades')}
                              className="rounded border-gray-300 text-green-deep focus:ring-green-deep mr-3"
                            />
                            <span className="font-roboto text-sm text-gray-700">{necessidade}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Save Button */}
                <div className="flex justify-end pt-6 border-t border-gray-200">
                  <Button
                    type="submit"
                    loading={loading}
                    icon={Save}
                    size="lg"
                  >
                    Salvar Alterações
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerfilEmpresa;
