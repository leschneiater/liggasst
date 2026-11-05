import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Mail, Lock, Eye, EyeOff, UserPlus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { validarCpfCnpj, validarCep, validarCelular } from '../../utils/dadosFaturamento';
import toast from 'react-hot-toast';

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  userType: 'professional' | 'company' | 'employee';
  name: string;
  documento: string;
  telefone: string;
  cep: string;
  bairro: string;
  endereco: string;
  numero: string;
}

const Register: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { signup, loading } = useAuth();
  
  const { register, handleSubmit, formState: { errors }, watch } = useForm<RegisterFormData>({
    defaultValues: {
      userType: 'professional'
    }
  });
  const watchPassword = watch('password');
  const watchUserType = watch('userType');

  const onSubmit = async (data: RegisterFormData) => {
    if (data.password !== data.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    try {
      const userData: Record<string, unknown> = {
        name: data.name,
        type: data.userType
      };
      // Dados de cobranca: coletados desde o cadastro de profissional e
      // empresa (desde 05/11) para a tela de assinatura vir completa.
      // Funcionario nao assina plano, entao nao preenche.
      if (data.userType !== 'employee') {
        if (data.userType === 'company') userData.cnpj = data.documento;
        else userData.cpf = data.documento;
        userData.telefone = data.telefone;
        userData.cep = data.cep;
        userData.endereco = data.endereco;
        userData.numero = data.numero;
        userData.bairro = data.bairro;
      }

      await signup(data.email, data.password, userData, data.userType);
    } catch {
      // Erro já tratado no contexto
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-deep via-green-medium to-green-light flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white p-8 rounded-2xl shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center space-x-2 mb-6">
              <div className="w-12 h-12 bg-green-deep rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">L</span>
              </div>
              <span className="font-poppins font-bold text-2xl text-green-deep">
                LiggaSST
              </span>
            </Link>
            <h2 className="font-poppins font-bold text-3xl text-soft-black">
              Criar Conta
            </h2>
            <p className="font-roboto text-gray-600 mt-2">
              Cadastre-se para acessar a plataforma
            </p>
          </div>

          {/* Register Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="bg-neutral-gray p-4 rounded-lg mb-4">
              <p className="font-roboto text-sm text-gray-700 mb-3">Eu sou:</p>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="professional"
                    {...register('userType')}
                    className="text-green-deep focus:ring-green-deep mr-2"
                  />
                  <span className="font-roboto text-sm">Profissional</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="company"
                    {...register('userType')}
                    className="text-green-deep focus:ring-green-deep mr-2"
                  />
                  <span className="font-roboto text-sm">Empresa</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="employee"
                    {...register('userType')}
                    className="text-green-deep focus:ring-green-deep mr-2"
                  />
                  <span className="font-roboto text-sm">Funcionário</span>
                </label>
              </div>
            </div>

            <Input
              label={watchUserType === 'company' ? "Nome da Empresa" : "Nome Completo"}
              placeholder={watchUserType === 'company' ? "Razão social da empresa" : "Seu nome completo"}
              error={errors.name?.message}
              {...register('name', { required: 'Nome é obrigatório' })}
            />

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

            {watchUserType !== 'employee' && (
              <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                <p className="font-roboto text-xs text-gray-500">
                  Dados de cobrança: usados apenas se você assinar um plano pago,
                  para a tela de assinatura já vir preenchida.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label={watchUserType === 'company' ? 'CNPJ' : 'CPF'}
                    placeholder={watchUserType === 'company' ? '00.000.000/0000-00' : '000.000.000-00'}
                    error={errors.documento?.message}
                    {...register('documento', {
                      required: 'Documento é obrigatório',
                      validate: (value) =>
                        watchUserType === 'employee' ||
                        validarCpfCnpj(value, watchUserType === 'company' ? 'company' : 'professional') ||
                        true as const,
                    })}
                  />
                  <Input
                    label="Celular"
                    placeholder="(11) 99999-0000"
                    error={errors.telefone?.message}
                    {...register('telefone', {
                      required: 'Celular é obrigatório',
                      validate: (value) => validarCelular(value) ?? true,
                    })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="CEP"
                    placeholder="00000-000"
                    error={errors.cep?.message}
                    {...register('cep', {
                      required: 'CEP é obrigatório',
                      validate: (value) => validarCep(value) ?? true,
                    })}
                  />
                  <Input
                    label="Bairro"
                    placeholder="Seu bairro"
                    error={errors.bairro?.message}
                    {...register('bairro', { required: 'Bairro é obrigatório' })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Endereço"
                    placeholder="Rua, avenida..."
                    error={errors.endereco?.message}
                    {...register('endereco', { required: 'Endereço é obrigatório' })}
                  />
                  <Input
                    label="Número"
                    placeholder="123"
                    error={errors.numero?.message}
                    {...register('numero', { required: 'Número é obrigatório' })}
                  />
                </div>
              </div>
            )}

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
                aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
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
                aria-label={showConfirmPassword ? "Esconder senha" : "Mostrar senha"}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                required
                className="rounded border-gray-300 text-green-deep focus:ring-green-deep"
                aria-label="Aceitar termos de uso e política de privacidade"
              />
              <span className="ml-2 font-roboto text-sm text-gray-600">
                Aceito os{' '}
                <Link 
                  to="/termos-de-uso" 
                  className="text-green-deep hover:text-green-medium underline"
                >
                  Termos de Uso
                </Link>
                {' '}e{' '}
                <Link 
                  to="/politica-de-privacidade" 
                  className="text-green-deep hover:text-green-medium underline"
                >
                  Política de Privacidade
                </Link>
              </span>
            </div>

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={loading}
              icon={UserPlus}
              className="bg-green-deep text-white hover:bg-green-medium"
            >
              Criar Conta
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="font-roboto text-gray-600 mb-4">
              Já tem uma conta?
            </p>
            <Button
              as={Link}
              to="/auth/login"
              variant="outline"
              fullWidth
              className="border-green-deep text-green-deep hover:bg-green-deep hover:text-white"
            >
              Fazer Login
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
