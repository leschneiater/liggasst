import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { auth, db } from '../config/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

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
      
      // Autenticar usuário com Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Verificar se o email foi confirmado
      if (!firebaseUser.emailVerified) {
        toast.error('Por favor, confirme seu e-mail antes de fazer login. Verifique sua caixa de entrada.');
        throw new Error('Email não verificado');
      }
      
      // Buscar dados do usuário no Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (!userDoc.exists()) {
        throw new Error('Dados do usuário não encontrados');
      }
      
      const userData = userDoc.data();
      const user: User = {
        id: firebaseUser.uid,
        email: firebaseUser.email!,
        type: userData.type,
        verified: firebaseUser.emailVerified,
        ...userData
      };
      
      // Definir usuário atual
      setCurrentUser(user);
      setUserType(user.type);
      setUserData(userData);
      
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
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'Usuário não encontrado';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Senha incorreta';
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Credenciais inválidas';
      } else if (error.code === 'auth/too-many-requests') {
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
      
      // Registrar usuário com Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Salvar dados adicionais no Firestore
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        ...userData,
        type,
        email,
        createdAt: new Date().toISOString(),
        verified: false
      });
      
      toast.success('Cadastro realizado! Verifique seu e-mail para ativar a conta.');
      
    } catch (error: any) {
      console.error('Signup error:', error);
      
      let errorMessage = 'Erro ao criar conta';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este e-mail já está em uso';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Senha muito fraca. Use pelo menos 6 caracteres';
      } else if (error.code === 'auth/invalid-email') {
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
      await signOut(auth);
      
      // Limpar dados de sessão
      setCurrentUser(null);
      setUserType(null);
      setUserData(null);
      
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
      await sendPasswordResetEmail(auth, email);
      toast.success('E-mail de recuperação enviado!');
    } catch (error: any) {
      console.error('Password reset error:', error);
      
      let errorMessage = 'Erro ao enviar e-mail de recuperação';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Usuário não encontrado';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'E-mail inválido';
      }
      
      toast.error(errorMessage);
      throw error;
    }
  };

  const uploadProfilePhoto = async (file: File): Promise<string> => {
    if (!currentUser) throw new Error('Usuário não autenticado');
    
    try {
      // Implementação simplificada para upload
      // Em produção, use Firebase Storage
      const photoURL = `https://example.com/photos/${currentUser.id}`;
      
      // Atualizar URL da foto no Firestore
      await updateDoc(doc(db, 'users', currentUser.id), {
        photoURL
      });
      
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
      // Atualizar dados no Firestore
      await updateDoc(doc(db, 'users', currentUser.id), data);
      
      // Atualizar estado local
      setUserData((prev: any) => ({ ...prev, ...data }));
      
      toast.success('Perfil atualizado com sucesso!');
    } catch (error: any) {
      console.error('Update profile error:', error);
      toast.error('Erro ao atualizar perfil');
      throw error;
    }
  };

  const loadUserData = async (firebaseUser: FirebaseUser) => {
    try {
      // Buscar dados do usuário no Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (!userDoc.exists()) {
        throw new Error('Usuário não encontrado');
      }
      
      const userData = userDoc.data();
      const user: User = {
        id: firebaseUser.uid,
        email: firebaseUser.email!,
        type: userData.type,
        verified: firebaseUser.emailVerified,
        ...userData
      };
      
      setCurrentUser(user);
      setUserType(userData.type);
      setUserData(userData);
    } catch (error) {
      console.error('Error loading user data:', error);
      setCurrentUser(null);
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

  // Verificar sessão ao carregar
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setLoading(true);
      
      if (firebaseUser) {
        await loadUserData(firebaseUser);
      } else {
        setCurrentUser(null);
        setUserType(null);
        setUserData(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
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