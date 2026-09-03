import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  Mail, 
  Lock, 
  Phone, 
  MapPin, 
  FileText, 
  Eye, 
  EyeOff,
  User,
  Users,
  X,
  CheckCircle,
  Camera,
  Upload
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from './ui/Button';
import Input from './ui/Input';
import toast from 'react-hot-toast';

interface CompanyFormData {
  nomeEmpresa: string;
  cnpj: string;
  email: string;
  password: string;
  confirmPassword: string;
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

interface CadastroEmpresaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CadastroEmpresaModal: React.FC<CadastroEmpresaModalProps> = ({ isOpen, onClose }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cadastroSucesso, setCadastroSucesso] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const { signup } = useAuth();
  
  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm<CompanyFormData>();
  const watchPassword = watch('password');

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
    'PGR - Programa de Gerenciamento de Riscos',
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

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('A imagem deve ter no máximo 5MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast.error('Apenas arquivos de imagem são aceitos');
        return;
      }

      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: CompanyFormData) => {
    if (data.password !== data.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setLoading(true);
    try {
      const companyData = {
        nomeEmpresa: data.nomeEmpresa,
        cnpj: data.cnpj,
        telefone: data.telefone,
        cep: data.cep,
        cidade: data.cidade,
        estado: data.estado,
        endereco: data.endereco,
        segmento: data.segmento,
        numeroFuncionarios: data.numeroFuncionarios,
        nomeResponsavel: data.nomeResponsavel,
        cargoResponsavel: data.cargoResponsavel,
        emailResponsavel: data.emailResponsavel,
        telefoneResponsavel: data.telefoneResponsavel,
        descricaoEmpresa: data.descricaoEmpresa,
        necessidades: data.necessidades || [],
        tipo: 'company',
        logoFile: logoFile
      };

      await signup(data.email, data.password, companyData, 'company');
      setCadastroSucesso(true);
    } catch (error) {
      console.error('Signup error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    reset();
    setShowPassword(false);
    setShowConfirmPassword(false);
    setCadastroSucesso(false);
    setLogoFile(null);
    setLogoPreview(null);
  };

  if (!isOpen) return null;

  if (cadastroSucesso) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-light rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={32} className="text-green-deep" />
          </div>
          
          <h2 className="font-poppins font-bold text-2xl text-soft-black mb-4">
            Cadastro Realizado!
          </h2>
          
          <p className="font-roboto text-gray-600 mb-6">
            Sua conta foi criada com sucesso! Verifique seu e-mail para ativar a conta antes de fazer login.
          </p>
          
          <div className="bg-green-light bg-opacity-20 p-4 rounded-lg mb-6">
            <h3 className="font-poppins font-semibold text-green-deep mb-2">
              Próximos Passos:
            </h3>
            <ul className="font-roboto text-sm text-green-deep space-y-1 text-left">
              <li>• Verifique seu e-mail e clique no link de confirmação</li>
              <li>• Faça login na plataforma</li>
              <li>• Complete seu perfil empresarial</li>
              <li>• Explore profissionais disponíveis</li>
            </ul>
          </div>
          
          <Button onClick={handleClose} fullWidth>
            Continuar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-green-deep rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">L</span>
              </div>
              <span className="font-poppins font-bold text-xl text-green-deep">
                LiggaSST
              </span>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          <div className="text-center mb-6">
            <h2 className="font-poppins font-bold text-2xl text-soft-black mb-2">
              Cadastro Empresa
            </h2>
            <p className="font-roboto text-gray-600">
              Cadastre sua empresa e encontre profissionais qualificados
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Logo Upload */}
            <div className="text-center mb-6">
              <label className="block font-roboto font-medium text-soft-black text-sm mb-3">
                Logo da Empresa (Opcional)
              </label>
              <div className="relative inline-block">
                <div className="w-24 h-24 bg-green-light rounded-lg flex items-center justify-center mx-auto border-2 border-dashed border-green-medium overflow-hidden">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera size={24} className="text-green-deep" />
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-deep rounded-full flex items-center justify-center text-white">
                  <Upload size={16} />
                </div>
              </div>
              <p className="font-roboto text-xs text-gray-500 mt-2">
                Clique para fazer upload (máx. 5MB)
              </p>
            </div>

            {/* Dados da Empresa */}
            <div className="space-y-4">
              <h3 className="font-poppins font-semibold text-lg text-soft-black">
                Dados da Empresa
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nome da Empresa"
                  icon={Building2}
                  placeholder="Razão social da empresa"
                  error={errors.nomeEmpresa?.message}
                  {...register('nomeEmpresa', { required: 'Nome da empresa é obrigatório' })}
                />
                <Input
                  label="CNPJ"
                  icon={FileText}
                  placeholder="00.000.000/0000-00"
                  error={errors.cnpj?.message}
                  {...register('cnpj', { required: 'CNPJ é obrigatório' })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="E-mail da Empresa"
                  type="email"
                  icon={Mail}
                  placeholder="contato@empresa.com"
                  error={errors.email?.message}
                  {...register('email', {
                    required: 'E-mail é obrigatório',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'E-mail inválido'
                    }
                  })}
                />
                <Input
                  label="Telefone"
                  icon={Phone}
                  placeholder="(11) 99999-9999"
                  error={errors.telefone?.message}
                  {...register('telefone', { required: 'Telefone é obrigatório' })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Input
                    label="Senha"
                    type={showPassword ? 'text' : 'password'}
                    icon={Lock}
                    placeholder="Sua senha"
                    error={errors.password?.message}
                    {...register('password', {
                      required: 'Senha é obrigatória',
                      minLength: {
                        value: 10,
                        message: 'Senha deve ter pelo menos 10 caracteres'
                      }
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className="relative">
                  <Input
                    label="Confirmar Senha"
                    type={showConfirmPassword ? 'text' : 'password'}
                    icon={Lock}
                    placeholder="Confirme sua senha"
                    error={errors.confirmPassword?.message}
                    {...register('confirmPassword', {
                      required: 'Confirmação de senha é obrigatória',
                      validate: (value) => value === watchPassword || 'As senhas não coincidem'
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="CEP"
                  icon={MapPin}
                  placeholder="00000-000"
                  error={errors.cep?.message}
                  {...register('cep', { required: 'CEP é obrigatório' })}
                />
                <Input
                  label="Cidade"
                  placeholder="Cidade"
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
                  {errors.estado && (
                    <p className="text-red-500 text-sm font-roboto">{errors.estado.message}</p>
                  )}
                </div>
              </div>

              <Input
                label="Endereço Completo"
                placeholder="Rua, número, bairro"
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
                  {errors.segmento && (
                    <p className="text-red-500 text-sm font-roboto">{errors.segmento.message}</p>
                  )}
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
                  {errors.numeroFuncionarios && (
                    <p className="text-red-500 text-sm font-roboto">{errors.numeroFuncionarios.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-roboto font-medium text-soft-black text-sm mb-1">
                  Descrição da Empresa
                </label>
                <textarea
                  rows={3}
                  placeholder="Descreva a empresa, suas atividades e cultura..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-deep focus:border-green-deep"
                  {...register('descricaoEmpresa')}
                />
              </div>
            </div>

            {/* Responsável */}
            <div className="space-y-4">
              <h3 className="font-poppins font-semibold text-lg text-soft-black">
                Responsável pela Conta
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nome do Responsável"
                  icon={User}
                  placeholder="Nome completo"
                  error={errors.nomeResponsavel?.message}
                  {...register('nomeResponsavel', { required: 'Nome do responsável é obrigatório' })}
                />
                <Input
                  label="Cargo"
                  placeholder="Cargo na empresa"
                  error={errors.cargoResponsavel?.message}
                  {...register('cargoResponsavel', { required: 'Cargo é obrigatório' })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="E-mail do Responsável"
                  type="email"
                  icon={Mail}
                  placeholder="responsavel@empresa.com"
                  error={errors.emailResponsavel?.message}
                  {...register('emailResponsavel', {
                    required: 'E-mail do responsável é obrigatório',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'E-mail inválido'
                    }
                  })}
                />
                <Input
                  label="Telefone do Responsável"
                  icon={Phone}
                  placeholder="(11) 99999-9999"
                  error={errors.telefoneResponsavel?.message}
                  {...register('telefoneResponsavel', { required: 'Telefone do responsável é obrigatório' })}
                />
              </div>
            </div>

            {/* Necessidades */}
            <div className="space-y-4">
              <h3 className="font-poppins font-semibold text-lg text-soft-black">
                Principais Necessidades em SST
              </h3>

              <div>
                <label className="block font-roboto font-medium text-soft-black text-sm mb-3">
                  Selecione os serviços que sua empresa mais necessita:
                </label>
                <div className="grid grid-cols-1 gap-3 max-h-32 overflow-y-auto">
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

              <div className="bg-green-light bg-opacity-20 p-4 rounded-lg">
                <h3 className="font-poppins font-semibold text-green-deep mb-2">
                  Próximos Passos:
                </h3>
                <ul className="font-roboto text-sm text-green-deep space-y-1">
                  <li>• Verificaremos os dados da empresa</li>
                  <li>• Enviaremos um e-mail de confirmação</li>
                  <li>• Ative sua conta pelo e-mail</li>
                  <li>• Faça login e complete seu perfil</li>
                </ul>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  required
                  className="rounded border-gray-300 text-green-deep focus:ring-green-deep"
                />
                <span className="ml-2 font-roboto text-sm text-gray-600">
                  Aceito os{' '}
                  <Link 
                    to="/termos-de-uso" 
                    className="text-green-deep hover:text-green-medium underline"
                    onClick={handleClose}
                  >
                    Termos de Uso
                  </Link>
                  {' '}e{' '}
                  <Link 
                    to="/politica-de-privacidade" 
                    className="text-green-deep hover:text-green-medium underline"
                    onClick={handleClose}
                  >
                    Política de Privacidade
                  </Link>
                </span>
              </div>

              <Button type="submit" loading={loading} fullWidth size="lg">
                Criar Conta
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CadastroEmpresaModal;
