import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import toast from 'react-hot-toast';

interface ForgotPasswordFormData {
  email: string;
}

const ForgotPassword: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormData>();

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      setEmailSent(true);
      toast.success('E-mail de recuperação enviado!');
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast.error(error.message || 'Erro ao enviar e-mail de recuperação');
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-deep via-green-medium to-green-light flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-white p-8 rounded-2xl shadow-2xl text-center">
            <div className="w-16 h-16 bg-green-light rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={32} className="text-green-deep" />
            </div>
            
            <h2 className="font-poppins font-bold text-2xl text-soft-black mb-4">
              E-mail Enviado!
            </h2>
            
            <p className="font-roboto text-gray-600 mb-6">
              Enviamos um link de recuperação para seu e-mail. 
              Verifique sua caixa de entrada e siga as instruções.
            </p>
            
            <div className="space-y-4">
              <Button as={Link} to="/auth/login" fullWidth>
                Voltar ao Login
              </Button>
              
              <button
                onClick={() => setEmailSent(false)}
                className="w-full font-roboto text-green-deep hover:text-green-medium"
              >
                Enviar novamente
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              Recuperar Senha
            </h2>
            <p className="font-roboto text-gray-600 mt-2">
              Digite seu e-mail para receber o link de recuperação
            </p>
          </div>

          {/* Recovery Form */}
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

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={loading}
              icon={Mail}
            >
              Enviar Link de Recuperação
            </Button>
          </form>

          {/* Back to Login */}
          <div className="mt-8 text-center">
            <Link 
              to="/auth/login"
              className="inline-flex items-center font-roboto text-green-deep hover:text-green-medium"
            >
              <ArrowLeft size={16} className="mr-2" />
              Voltar ao login
            </Link>
          </div>

          {/* Help Text */}
          <div className="mt-6 p-4 bg-neutral-gray rounded-lg">
            <h3 className="font-poppins font-semibold text-sm text-soft-black mb-2">
              Não recebeu o e-mail?
            </h3>
            <ul className="font-roboto text-xs text-gray-600 space-y-1">
              <li>• Verifique sua caixa de spam</li>
              <li>• Confirme se o e-mail está correto</li>
              <li>• Aguarde alguns minutos</li>
              <li>• Entre em contato conosco se persistir</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;