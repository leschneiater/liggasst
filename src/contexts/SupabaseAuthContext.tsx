import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as db from '../lib/database';

interface User {
  id: string;
  email: string;
  type: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  session: any | null;
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
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Verificar se há sessão salva
    const checkSession = async () => {
      try {
        const sessionData = localStorage.getItem('db_session');
        
        if (sessionData) {
          const parsedSession = JSON.parse(sessionData);
          
          // Verificar se a sessão ainda é válida
          if (new Date(parsedSession.expires_at) > new Date()) {
            setSession(parsedSession);
            setUser(parsedSession.user);
          } else {
            // Sessão expirada
            localStorage.removeItem('db_session');
          }
        }
      } catch (error) {
        console.error('Erro ao verificar sessão:', error);
        localStorage.removeItem('db_session');
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const signUp = async (email: string, password: string, userData?: any) => {
    setLoading(true);
    try {
      // Determinar tipo de usuário
      const userType = userData?.type || 'professional';
      
      // Registrar usuário
      const result = await db.registerUser(email, password, userData, userType);
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao criar conta');
      }
      
      toast.success('Conta criada com sucesso! Verifique seu email para confirmar.');
    } catch (error: any) {
      console.error('Erro no cadastro:', error);
      toast.error(error.message || 'Erro ao criar conta');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      // Autenticar usuário
      const result = await db.authenticateUser(email, password);
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao fazer login');
      }
      
      // Verificar se o email foi confirmado
      if (!result.user.verified) {
        toast.error('Por favor, confirme seu e-mail antes de fazer login.');
        throw new Error('Email não verificado');
      }
      
      // Criar objeto de sessão
      const sessionData = {
        user: result.user,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas
      };
      
      // Salvar sessão
      localStorage.setItem('db_session', JSON.stringify(sessionData));
      
      // Atualizar estado
      setUser(result.user);
      setSession(sessionData);
      
      toast.success('Login realizado com sucesso!');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Erro no login:', error);
      toast.error(error.message || 'Erro ao fazer login');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      // Limpar sessão
      localStorage.removeItem('db_session');
      
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
      const result = await db.resetPassword(email);
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao enviar e-mail de recuperação');
      }
      
      toast.success('E-mail de recuperação enviado!');
    } catch (error: any) {
      console.error('Erro na recuperação de senha:', error);
      toast.error(error.message || 'Erro ao enviar e-mail de recuperação');
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