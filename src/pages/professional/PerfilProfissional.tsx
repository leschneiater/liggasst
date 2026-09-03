import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Award, 
  Calendar,
  DollarSign,
  Clock,
  Save,
  Camera,
  FileText
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import toast from 'react-hot-toast';

interface ProfileFormData {
  nome: string;
  email: string;
  telefone: string;
  cep: string;
  cidade: string;
  estado: string;
  endereco: string;
  formacao: string;
  especializacao: string;
  experiencia: string;
  registro: string;
  raioAtendimento: string;
  valorHora: string;
  disponibilidade: string[];
  descricao: string;
}

const PerfilProfissional: React.FC = () => {
  const { userData, updateUserProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dados-pessoais');
  
  const { register, handleSubmit, formState: { errors } } = useForm<ProfileFormData>({
    defaultValues: userData
  });

  const especialidades = [
    'Técnico em Segurança do Trabalho',
    'Engenheiro de Segurança do Trabalho',
    'Técnico em Enfermagem do Trabalho',
    'Enfermeiro do Trabalho',
    'Médico do Trabalho',
    'Consultor em SST',
    'Auditor em SST'
  ];

  const disponibilidades = [
    'Manhã',
    'Tarde',
    'Noite',
    'Finais de semana',
    'Feriados'
  ];

  const estados = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  const onSubmit = async (data: ProfileFormData) => {
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
    { id: 'dados-pessoais', label: 'Dados Pessoais', icon: User },
    { id: 'dados-profissionais', label: 'Dados Profissionais', icon: Award },
    { id: 'disponibilidade', label: 'Disponibilidade', icon: Clock },
    { id: 'descricao', label: 'Descrição', icon: FileText }
  ];

  return (
    <div className="min-h-screen bg-neutral-gray py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-poppins font-bold text-3xl text-soft-black mb-2">
            Meu Perfil
          </h1>
          <p className="font-roboto text-gray-600">
            Mantenha suas informações atualizadas para receber mais oportunidades
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              {/* Profile Photo */}
              <div className="text-center mb-6">
                <div className="relative inline-block">
                  <div className="w-24 h-24 bg-green-light rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="font-poppins font-bold text-2xl text-green-deep">
                      {userData?.nome?.split(' ').map(n => n[0]).join('') || 'U'}
                    </span>
                  </div>
                  <button className="absolute bottom-0 right-0 w-8 h-8 bg-green-deep rounded-full flex items-center justify-center text-white hover:bg-green-medium transition-colors">
                    <Camera size={16} />
                  </button>
                </div>
                <h3 className="font-poppins font-semibold text-lg text-soft-black">
                  {userData?.nome || 'Nome do Profissional'}
                </h3>
                <p className="font-roboto text-sm text-gray-600">
                  {userData?.formacao || 'Formação'}
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
                {/* Dados Pessoais */}
                {activeTab === 'dados-pessoais' && (
                  <div className="space-y-6">
                    <h2 className="font-poppins font-semibold text-xl text-soft-black mb-4">
                      Dados Pessoais
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Nome Completo"
                        icon={User}
                        error={errors.nome?.message}
                        {...register('nome', { required: 'Nome é obrigatório' })}
                      />
                      <Input
                        label="E-mail"
                        type="email"
                        icon={Mail}
                        error={errors.email?.message}
                        {...register('email', { required: 'E-mail é obrigatório' })}
                      />
                    </div>

                    <Input
                      label="Telefone"
                      icon={Phone}
                      error={errors.telefone?.message}
                      {...register('telefone', { required: 'Telefone é obrigatório' })}
                    />

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
                  </div>
                )}

                {/* Dados Profissionais */}
                {activeTab === 'dados-profissionais' && (
                  <div className="space-y-6">
                    <h2 className="font-poppins font-semibold text-xl text-soft-black mb-4">
                      Dados Profissionais
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-roboto font-medium text-soft-black text-sm mb-1">
                          Formação
                        </label>
                        <select
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-deep focus:border-green-deep"
                          {...register('formacao', { required: 'Formação é obrigatória' })}
                        >
                          <option value="">Selecione sua formação</option>
                          {especialidades.map((especialidade) => (
                            <option key={especialidade} value={especialidade}>{especialidade}</option>
                          ))}
                        </select>
                      </div>

                      <Input
                        label="Registro Profissional"
                        icon={Award}
                        error={errors.registro?.message}
                        {...register('registro', { required: 'Registro é obrigatório' })}
                      />
                    </div>

                    <Input
                      label="Especialização"
                      error={errors.especializacao?.message}
                      {...register('especializacao')}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input
                        label="Experiência (anos)"
                        type="number"
                        icon={Calendar}
                        error={errors.experiencia?.message}
                        {...register('experiencia', { required: 'Experiência é obrigatória' })}
                      />

                      <Input
                        label="Raio de Atendimento (km)"
                        type="number"
                        icon={MapPin}
                        error={errors.raioAtendimento?.message}
                        {...register('raioAtendimento', { required: 'Raio de atendimento é obrigatório' })}
                      />

                      <Input
                        label="Valor Hora (R$)"
                        type="number"
                        step="0.01"
                        icon={DollarSign}
                        error={errors.valorHora?.message}
                        {...register('valorHora')}
                      />
                    </div>
                  </div>
                )}

                {/* Disponibilidade */}
                {activeTab === 'disponibilidade' && (
                  <div className="space-y-6">
                    <h2 className="font-poppins font-semibold text-xl text-soft-black mb-4">
                      Disponibilidade
                    </h2>

                    <div>
                      <label className="block font-roboto font-medium text-soft-black text-sm mb-3">
                        Horários Disponíveis
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {disponibilidades.map((disponibilidade) => (
                          <label key={disponibilidade} className="flex items-center">
                            <input
                              type="checkbox"
                              value={disponibilidade}
                              {...register('disponibilidade')}
                              className="rounded border-gray-300 text-green-deep focus:ring-green-deep mr-2"
                            />
                            <span className="font-roboto text-sm text-gray-700">{disponibilidade}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Descrição */}
                {activeTab === 'descricao' && (
                  <div className="space-y-6">
                    <h2 className="font-poppins font-semibold text-xl text-soft-black mb-4">
                      Descrição Profissional
                    </h2>

                    <div>
                      <label className="block font-roboto font-medium text-soft-black text-sm mb-1">
                        Sobre Você
                      </label>
                      <textarea
                        rows={6}
                        placeholder="Descreva sua experiência, especialidades e diferenciais..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-deep focus:border-green-deep"
                        {...register('descricao')}
                      />
                      <p className="font-roboto text-xs text-gray-500 mt-1">
                        Esta descrição será exibida no seu perfil público
                      </p>
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

export default PerfilProfissional;
