import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string;
  type: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, userData?: any) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useSupabaseAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
};

export const SupabaseAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Verificar sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadUserProfile(session.user);
      }
      setLoading(false);
    });

    // Escutar mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      
      if (session?.user) {
        await loadUserProfile(session.user);
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (supabaseUser: SupabaseUser) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (error) {
        console.error('Erro ao carregar perfil:', error);
        return;
      }

      const userData: User = {
        id: supabaseUser.id,
        email: supabaseUser.email!,
        type: data?.type || 'professional',
        ...data
      };

      setUser(userData);
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
    }
  };

  const signUp = async (email: string, password: string, userData?: any) => {
    setLoading(true);
    try {
      // Registrar usuário no Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        // Salvar dados adicionais na tabela users
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email,
            type: userData?.type || 'professional',
            ...userData,
            created_at: new Date().toISOString()
          });

        if (profileError) {
          console.error('Erro ao salvar perfil:', profileError);
        }
      }
      
      toast.success('Conta criada com sucesso! Verifique seu email para confirmar.');
    } catch (error: any) {
      console.error('Erro no cadastro:', error);
      
      let errorMessage = 'Erro ao criar conta';
      
      if (error.message?.includes('already registered')) {
        errorMessage = 'Este e-mail já está em uso';
      } else if (error.message?.includes('Password should be')) {
        errorMessage = 'Senha muito fraca. Use pelo menos 6 caracteres';
      } else if (error.message?.includes('Invalid email')) {
        errorMessage = 'E-mail inválido';
      }
      
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      // Verificar se é o usuário de teste
      if (email === 'teste@liggasst.com.br' && password === 'teste123') {
        // Criar um usuário de teste temporário
        const testUser: User = {
          id: 'test-user-id',
          email: 'teste@liggasst.com.br',
          type: 'professional',
          name: 'Usuário de Teste',
          role: 'tester'
        };
        
        setUser(testUser);
        toast.success('Login de teste realizado com sucesso!');
        navigate('/dashboard');
        setLoading(false);
        return;
      }
      
      // Autenticar usuário
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      // Verificar se o email foi confirmado
      if (data.user && !data.user.email_confirmed_at) {
        toast.error('Por favor, confirme seu e-mail antes de fazer login.');
        throw new Error('Email não verificado');
      }
      
      toast.success('Login realizado com sucesso!');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Erro no login:', error);
      
      let errorMessage = 'Erro ao fazer login';
      
      if (error.message === 'Email não verificado') {
        throw error;
      } else if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'Credenciais inválidas';
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = 'Por favor, confirme seu e-mail antes de fazer login';
      }
      
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      // Verificar se é o usuário de teste
      if (user?.email === 'teste@liggasst.com.br') {
        setUser(null);
        setSession(null);
        toast.success('Logout realizado com sucesso!');
        navigate('/');
        setLoading(false);
        return;
      }
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      // Atualizar estado
      setUser(null);
      setSession(null);
      
      toast.success('Logout realizado com sucesso!');
      navigate('/');
    } catch (error: any) {
      console.error('Erro no logout:', error);
      toast.error(error.message || 'Erro ao fazer logout');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      
      if (error) {
        throw error;
      }
      
      toast.success('E-mail de recuperação enviado!');
    } catch (error: any) {
      console.error('Erro na recuperação de senha:', error);
      
      let errorMessage = 'Erro ao enviar e-mail de recuperação';
      
      if (error.message?.includes('User not found')) {
        errorMessage = 'Usuário não encontrado';
      } else if (error.message?.includes('Invalid email')) {
        errorMessage = 'E-mail inválido';
      }
      
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};