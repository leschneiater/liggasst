import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, X, Building2, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from './ui/Button';
import Input from './ui/Input';
import toast from 'react-hot-toast';

interface LoginFormData {
  email: string;
  password: string;
}

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCadastroEmpresa: () => void;
  onOpenCadastroProfissional: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ 
  isOpen, 
  onClose, 
  onOpenCadastroEmpresa, 
  onOpenCadastroProfissional 
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
      onClose();
      reset();
    } catch (error: any) {
      console.error('Login error:', error);
      // Erro já tratado no contexto de autenticação
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    reset();
    setShowPassword(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-8">
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
              aria-label="Fechar"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          <div className="text-center mb-6">
            <h2 className="font-poppins font-bold text-2xl text-soft-black mb-2">
              Fazer Login
            </h2>
            <p className="font-roboto text-gray-600">
              Acesse sua conta para continuar
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                <input 
                  type="checkbox" 
                  className="rounded border-gray-300 text-green-deep focus:ring-green-deep" 
                  aria-label="Lembrar-me"
                />
                <span className="ml-2 font-roboto text-sm text-gray-600">Lembrar-me</span>
              </label>
              <a
                href="/recuperar-senha"
                className="font-roboto text-sm text-green-deep hover:text-green-medium"
                onClick={handleClose}
              >
                Esqueceu a senha?
              </a>
            </div>

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={loading}
              className="bg-green-deep text-white hover:bg-green-medium"
            >
              Entrar
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="font-roboto text-gray-600 mb-3">
              Não tem uma conta?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  handleClose();
                  onOpenCadastroEmpresa();
                }}
                className="w-full text-center px-4 py-2 border border-green-deep text-green-deep rounded-lg hover:bg-green-deep hover:text-white transition-colors duration-200 font-roboto font-medium"
              >
                Sou Empresa
              </button>
              <button
                onClick={() => {
                  handleClose();
                  onOpenCadastroProfissional();
                }}
                className="w-full text-center px-4 py-2 bg-green-light text-green-deep rounded-lg hover:bg-green-deep hover:text-white transition-colors duration-200 font-roboto font-medium"
              >
                Sou Profissional
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;