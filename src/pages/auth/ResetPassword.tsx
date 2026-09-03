import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle, Eye, EyeOff, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

interface ResetPasswordForm {
  password: string;
  confirmPassword: string;
}

const ResetPassword = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { session, loading, updatePassword, logout } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { errors } } = useForm<ResetPasswordForm>();
  const password = watch('password');

  const onSubmit = async (data: ResetPasswordForm) => {
    setSubmitting(true);
    try {
      await updatePassword(data.password);
      setSuccess(true);
      toast.success('Senha atualizada com sucesso.');
      await logout();
      navigate('/auth/login', { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar a senha.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Validando link...</div>;
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-gray px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center">
          <h1 className="font-poppins font-bold text-2xl mb-3">Link inválido ou expirado</h1>
          <p className="font-roboto text-gray-600 mb-6">Solicite um novo link para redefinir sua senha.</p>
          <Button as={Link} to="/auth/forgot-password" fullWidth>Solicitar novo link</Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-gray px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center">
          <CheckCircle className="mx-auto mb-4 text-green-deep" size={48} />
          <h1 className="font-poppins font-bold text-2xl">Senha atualizada</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-deep via-green-medium to-green-light flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-2xl">
        <h1 className="font-poppins font-bold text-3xl text-soft-black mb-2">Criar nova senha</h1>
        <p className="font-roboto text-gray-600 mb-6">Use pelo menos 10 caracteres.</p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="relative">
            <Input
              label="Nova senha"
              type={showPassword ? 'text' : 'password'}
              icon={Lock}
              error={errors.password?.message}
              {...register('password', {
                required: 'Senha é obrigatória',
                minLength: { value: 10, message: 'Use pelo menos 10 caracteres' },
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-8 text-gray-400"
              aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <Input
            label="Confirmar nova senha"
            type={showPassword ? 'text' : 'password'}
            icon={Lock}
            error={errors.confirmPassword?.message}
            {...register('confirmPassword', {
              required: 'Confirme a senha',
              validate: (value) => value === password || 'As senhas não coincidem',
            })}
          />
          <Button type="submit" fullWidth loading={submitting}>Atualizar senha</Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
