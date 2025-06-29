import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as db from '../lib/database';

interface User {
  id: string;
  email: string;
  type: 'professional' | 'company' | 'admin';
  verified: boolean;
  [key: string]: any;
}

interface AuthContextType {
  currentUser: User | null;
  userType: 'professional' | 'company' | 'admin' | null;
  userData: any;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, userData: any, type: 'professional' | 'company') => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  uploadProfilePhoto: (file: File) => Promise<string>;
  updateUserProfile: (data: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userType, setUserType] = useState<'professional' | 'company' | 'admin' | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      // Autenticar usuário
      const result = await db.authenticateUser(email, password);
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao fazer login');
      }
      
      // Verificar se o email foi confirmado
      if (!result.user.verified) {
        toast.error('Por favor, confirme seu e-mail antes de fazer login. Verifique sua caixa de entrada.');
        throw new Error('Email não verificado');
      }
      
      // Definir usuário atual
      setCurrentUser(result.user);
      setUserType(result.user.type);
      setUserData(result.user);
      
      toast.success('Login realizado com sucesso!');
      
      // Redirecionar após carregar os dados
      setTimeout(() => {
        redirectToDashboard();
      }, 1000);
      
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Tratar erros específicos
      let errorMessage = 'Erro ao fazer login';
      
      if (error.message === 'Email não verificado') {
        throw error;
      } else if (error.message === 'Usuário não encontrado') {
        errorMessage = 'Usuário não encontrado';
      } else if (error.message === 'Senha incorreta') {
        errorMessage = 'Senha incorreta';
      } else if (error.message.includes('invalid-credential')) {
        errorMessage = 'Credenciais inválidas';
      } else if (error.message.includes('too-many-requests')) {
        errorMessage = 'Muitas tentativas. Tente novamente mais tarde';
      }
      
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, password: string, userData: any, type: 'professional' | 'company') => {
    try {
      setLoading(true);
      
      // Registrar usuário
      const result = await db.registerUser(email, password, userData, type);
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao criar conta');
      }
      
      // Enviar email de verificação
      const verificationToken = generateVerificationToken();
      
      // Salvar token no banco (implementação simplificada)
      // Em produção, salve em uma tabela de tokens de verificação
      
      await db.sendVerificationEmail(email, verificationToken);
      
      toast.success('Cadastro realizado! Verifique seu e-mail para ativar a conta.');
      
    } catch (error: any) {
      console.error('Signup error:', error);
      
      let errorMessage = 'Erro ao criar conta';
      
      if (error.message.includes('já está em uso')) {
        errorMessage = 'Este e-mail já está em uso';
      } else if (error.message.includes('weak-password')) {
        errorMessage = 'Senha muito fraca. Use pelo menos 6 caracteres';
      } else if (error.message.includes('invalid-email')) {
        errorMessage = 'E-mail inválido';
      }
      
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Limpar dados de sessão
      setCurrentUser(null);
      setUserType(null);
      setUserData(null);
      
      // Limpar localStorage/sessionStorage se necessário
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_session');
      
      navigate('/');
      toast.success('Logout realizado com sucesso!');
    } catch (error: any) {
      console.error('Logout error:', error);
      toast.error('Erro ao fazer logout');
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const result = await db.resetPassword(email);
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao enviar e-mail de recuperação');
      }
      
      toast.success('E-mail de recuperação enviado!');
    } catch (error: any) {
      console.error('Password reset error:', error);
      
      let errorMessage = 'Erro ao enviar e-mail de recuperação';
      
      if (error.message.includes('user-not-found')) {
        errorMessage = 'Usuário não encontrado';
      } else if (error.message.includes('invalid-email')) {
        errorMessage = 'E-mail inválido';
      }
      
      toast.error(errorMessage);
      throw error;
    }
  };

  const uploadProfilePhoto = async (file: File): Promise<string> => {
    if (!currentUser) throw new Error('Usuário não autenticado');
    
    try {
      // Upload do arquivo
      const path = `profile-photos/${currentUser.id}`;
      const uploadResult = await db.uploadFile(file, path);
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Erro ao fazer upload da foto');
      }
      
      const photoURL = uploadResult.url;
      
      // Atualizar URL da foto no perfil do usuário
      await db.query(
        'UPDATE users SET photo_url = ? WHERE id = ?',
        [photoURL, currentUser.id]
      );
      
      // Atualizar estado local
      setUserData((prev: any) => ({ ...prev, photoURL }));
      
      return photoURL;
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Erro ao fazer upload da foto');
      throw error;
    }
  };

  const updateUserProfile = async (data: any) => {
    if (!currentUser) throw new Error('Usuário não autenticado');
    
    try {
      const result = await db.saveUserProfile(currentUser.id, data, userType || 'professional');
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao atualizar perfil');
      }
      
      // Atualizar estado local
      setUserData((prev: any) => ({ ...prev, ...data }));
      
      toast.success('Perfil atualizado com sucesso!');
    } catch (error: any) {
      console.error('Update profile error:', error);
      toast.error('Erro ao atualizar perfil');
      throw error;
    }
  };

  const loadUserData = async (userId: string) => {
    try {
      // Buscar dados do usuário
      const result = await db.fetchUserProfile(userId);
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao carregar dados do usuário');
      }
      
      const userData = result.data[0];
      
      if (!userData) {
        throw new Error('Usuário não encontrado');
      }
      
      setUserType(userData.type);
      setUserData(userData);
    } catch (error) {
      console.error('Error loading user data:', error);
      setUserType(null);
      setUserData(null);
    }
  };

  const redirectToDashboard = () => {
    if (!userType) return;
    
    switch (userType) {
      case 'professional':
        navigate('/dashboard-profissional');
        break;
      case 'company':
        navigate('/dashboard-empresa');
        break;
      case 'admin':
        navigate('/admin');
        break;
      default:
        navigate('/');
    }
  };

  // Gerar token de verificação
  const generateVerificationToken = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  // Verificar sessão ao carregar
  useEffect(() => {
    const checkSession = async () => {
      setLoading(true);
      
      try {
        // Verificar se há token salvo
        const token = localStorage.getItem('auth_token');
        
        if (!token) {
          setLoading(false);
          return;
        }
        
        // Verificar token com o servidor
        // Implementação simplificada para exemplo
        const userId = token; // Em produção, decodifique o token
        
        // Carregar dados do usuário
        await loadUserData(userId);
      } catch (error) {
        console.error('Session check error:', error);
        // Limpar dados em caso de erro
        setCurrentUser(null);
        setUserType(null);
        setUserData(null);
        localStorage.removeItem('auth_token');
      } finally {
        setLoading(false);
      }
    };
    
    checkSession();
  }, []);

  const value: AuthContextType = {
    currentUser,
    userType,
    userData,
    loading,
    login,
    signup,
    logout,
    resetPassword,
    uploadProfilePhoto,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Função auxiliar para upload de arquivo
const uploadFile = async (file: File, path: string) => {
  try {
    // Implementação simplificada para exemplo
    // Em produção, use um serviço de armazenamento
    
    // Simular URL de arquivo
    const fileName = `${Date.now()}_${file.name}`;
    const url = `https://liggasst.com.br/uploads/${path}/${fileName}`;
    
    return { success: true, url };
  } catch (error) {
    console.error('File upload error:', error);
    return { success: false, error };
  }
};