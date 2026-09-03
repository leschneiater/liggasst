import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import { useSupabaseAuth } from '../../contexts/SupabaseAuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

interface LoginFormData {
  email: string;
  password: string;
}

const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, loading } = useSupabaseAuth();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    try {
      await signIn(data.email, data.password);
      // Redirecionamento é feito no contexto de autenticação
    } catch (error) {
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
              Fazer Login
            </h2>
            <p className="font-roboto text-gray-600 mt-2">
              Acesse sua conta para continuar
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300 text-green-deep focus:ring-green-deep" />
                <span className="ml-2 font-roboto text-sm text-gray-600">Lembrar-me</span>
              </label>
              <Link
                to="/auth/forgot-password"
                className="font-roboto text-sm text-green-deep hover:text-green-medium"
              >
                Esqueceu a senha?
              </Link>
            </div>

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={loading}
              icon={LogIn}
              className="bg-green-deep text-white hover:bg-green-medium"
            >
              Entrar
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="font-roboto text-gray-600 mb-4">
              Não tem uma conta?
            </p>
            <Button
              as={Link}
              to="/auth/register"
              variant="outline"
              fullWidth
              className="border-green-deep text-green-deep hover:bg-green-deep hover:text-white"
            >
              Criar Conta
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
