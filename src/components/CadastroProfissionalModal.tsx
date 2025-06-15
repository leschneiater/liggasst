import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Lock, 
  Phone, 
  MapPin, 
  FileText, 
  Eye, 
  EyeOff,
  Award,
  Calendar,
  X,
  CheckCircle,
  Camera,
  Upload
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from './ui/Button';
import Input from './ui/Input';
import toast from 'react-hot-toast';

interface ProfessionalFormData {
  nome: string;
  email: string;
  password: string;
  confirmPassword: string;
  telefone: string;
  cpf: string;
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

interface CadastroProfissionalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CadastroProfissionalModal: React.FC<CadastroProfissionalModalProps> = ({ isOpen, onClose }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cadastroSucesso, setCadastroSucesso] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const { signup } = useAuth();
  
  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm<ProfessionalFormData>();
  const watchPassword = watch('password');

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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: ProfessionalFormData) => {
    if (data.password !== data.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setLoading(true);
    try {
      const professionalData = {
        nome: data.nome,
        telefone: data.telefone,
        cpf: data.cpf,
        cep: data.cep,
        cidade: data.cidade,
        estado: data.estado,
        endereco: data.endereco,
        formacao: data.formacao,
        especializacao: data.especializacao,
        experiencia: data.experiencia,
        registro: data.registro,
        raioAtendimento: data.raioAtendimento,
        valorHora: data.valorHora,
        disponibilidade: data.disponibilidade || [],
        descricao: data.descricao,
        tipo: 'professional',
        photoFile: photoFile
      };

      await signup(data.email, data.password, professionalData, 'professional');
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
    setPhotoFile(null);
    setPhotoPreview(null);
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
              <li>• Complete seu perfil profissional</li>
              <li>• Faça upload dos seus certificados</li>
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
              Cadastro Profissional
            </h2>
            <p className="font-roboto text-gray-600">
              Crie seu perfil e encontre oportunidades em todo o Brasil
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Photo Upload */}
            <div className="text-center mb-6">
              <label className="block font-roboto font-medium text-soft-black text-sm mb-3">
                Foto de Perfil (Opcional)
              </label>
              <div className="relative inline-block">
                <div className="w-24 h-24 bg-green-light rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-green-medium overflow-hidden">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Photo preview" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <Camera size={24} className="text-green-deep" />
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
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

            {/* Dados Pessoais */}
            <div className="space-y-4">
              <h3 className="font-poppins font-semibold text-lg text-soft-black">
                Dados Pessoais
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nome Completo"
                  icon={User}
                  placeholder="Seu nome completo"
                  error={errors.nome?.message}
                  {...register('nome', { required: 'Nome é obrigatório' })}
                />
                <Input
                  label="CPF"
                  icon={FileText}
                  placeholder="000.000.000-00"
                  error={errors.cpf?.message}
                  {...register('cpf', { required: 'CPF é obrigatório' })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="E-mail"
                  type="email"
                  icon={Mail}
                  placeholder="seu@email.com"
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
                        value: 6,
                        message: 'Senha deve ter pelo menos 6 caracteres'
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
                  placeholder="Sua cidade"
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
            </div>

            {/* Dados Profissionais */}
            <div className="space-y-4">
              <h3 className="font-poppins font-semibold text-lg text-soft-black">
                Dados Profissionais
              </h3>

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
                  {errors.formacao && (
                    <p className="text-red-500 text-sm font-roboto">{errors.formacao.message}</p>
                  )}
                </div>

                <Input
                  label="Registro Profissional"
                  icon={Award}
                  placeholder="Ex: CREA, CRT, etc."
                  error={errors.registro?.message}
                  {...register('registro', { required: 'Registro é obrigatório' })}
                />
              </div>

              <Input
                label="Especialização"
                placeholder="Suas áreas de especialização"
                error={errors.especializacao?.message}
                {...register('especializacao')}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Experiência (anos)"
                  type="number"
                  icon={Calendar}
                  placeholder="Anos de experiência"
                  error={errors.experiencia?.message}
                  {...register('experiencia', { required: 'Experiência é obrigatória' })}
                />

                <Input
                  label="Raio de Atendimento (km)"
                  type="number"
                  icon={MapPin}
                  placeholder="Até quantos km atende"
                  error={errors.raioAtendimento?.message}
                  {...register('raioAtendimento', { required: 'Raio de atendimento é obrigatório' })}
                />

                <Input
                  label="Valor Hora (R$)"
                  type="number"
                  step="0.01"
                  placeholder="Seu valor por hora"
                  error={errors.valorHora?.message}
                  {...register('valorHora')}
                />
              </div>

              <div>
                <label className="block font-roboto font-medium text-soft-black text-sm mb-2">
                  Disponibilidade
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
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

              <div>
                <label className="block font-roboto font-medium text-soft-black text-sm mb-1">
                  Descrição Profissional
                </label>
                <textarea
                  rows={4}
                  placeholder="Descreva sua experiência, especialidades e diferenciais..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-deep focus:border-green-deep"
                  {...register('descricao')}
                />
              </div>

              <div className="bg-green-light bg-opacity-20 p-4 rounded-lg">
                <h3 className="font-poppins font-semibold text-green-deep mb-2">
                  Próximos Passos:
                </h3>
                <ul className="font-roboto text-sm text-green-deep space-y-1">
                  <li>• Verificaremos seus documentos</li>
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

export default CadastroProfissionalModal;