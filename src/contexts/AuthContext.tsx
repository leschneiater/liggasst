import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  onAuthStateChanged,
  sendEmailVerification,
  updateProfile
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../config/firebase';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

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
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // Verificar se o email foi confirmado
      if (!result.user.emailVerified) {
        await signOut(auth);
        toast.error('Por favor, confirme seu e-mail antes de fazer login. Verifique sua caixa de entrada.');
        throw new Error('Email não verificado');
      }

      // Buscar dados do usuário e tipo
      await loadUserData(result.user.uid);
      
      toast.success('Login realizado com sucesso!');
      
      // Redirecionar após carregar os dados
      setTimeout(() => {
        redirectToDashboard();
      }, 1000);
      
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.message === 'Email não verificado') {
        throw error;
      }
      
      // Tratar erros específicos do Firebase
      let errorMessage = 'Erro ao fazer login';
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'Usuário não encontrado';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Senha incorreta';
          break;
        case 'auth/invalid-email':
          errorMessage = 'E-mail inválido';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Muitas tentativas. Tente novamente mais tarde';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Credenciais inválidas';
          break;
        default:
          errorMessage = error.message || 'Erro ao fazer login';
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
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const userId = result.user.uid;
      
      // Atualizar perfil do usuário
      await updateProfile(result.user, {
        displayName: userData.nome || userData.nomeEmpresa
      });
      
      // Salvar dados do usuário no Firestore
      const userDocData = {
        ...userData,
        uid: userId,
        email: email,
        type: type,
        createdAt: new Date().toISOString(),
        status: 'active',
        verified: false,
        profileComplete: false,
        photoURL: null
      };

      // Salvar na coleção específica (profissionais ou empresas)
      const collectionName = type === 'professional' ? 'profissionais' : 'empresas';
      await setDoc(doc(db, collectionName, userId), userDocData);

      // Salvar referência na coleção users para controle de tipo
      await setDoc(doc(db, 'users', userId), {
        type: type,
        email: email,
        createdAt: new Date().toISOString()
      });

      // Enviar email de verificação
      await sendEmailVerification(result.user);
      
      // Fazer logout para forçar verificação de email
      await signOut(auth);

      toast.success('Cadastro realizado! Verifique seu e-mail para ativar a conta.');
      
    } catch (error: any) {
      console.error('Signup error:', error);
      
      let errorMessage = 'Erro ao criar conta';
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Este e-mail já está em uso';
          break;
        case 'auth/weak-password':
          errorMessage = 'Senha muito fraca. Use pelo menos 6 caracteres';
          break;
        case 'auth/invalid-email':
          errorMessage = 'E-mail inválido';
          break;
        default:
          errorMessage = error.message || 'Erro ao criar conta';
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
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'Usuário não encontrado';
          break;
        case 'auth/invalid-email':
          errorMessage = 'E-mail inválido';
          break;
        default:
          errorMessage = error.message || 'Erro ao enviar e-mail de recuperação';
      }
      
      toast.error(errorMessage);
      throw error;
    }
  };

  const uploadProfilePhoto = async (file: File): Promise<string> => {
    if (!currentUser) throw new Error('Usuário não autenticado');
    
    try {
      const photoRef = ref(storage, `profile-photos/${currentUser.uid}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(photoRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      // Atualizar URL da foto no perfil do usuário
      await updateProfile(currentUser, { photoURL: downloadURL });
      
      // Atualizar no Firestore
      const collectionName = userType === 'professional' ? 'profissionais' : 'empresas';
      await updateDoc(doc(db, collectionName, currentUser.uid), {
        photoURL: downloadURL,
        updatedAt: new Date().toISOString()
      });
      
      // Atualizar estado local
      setUserData((prev: any) => ({ ...prev, photoURL: downloadURL }));
      
      return downloadURL;
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Erro ao fazer upload da foto');
      throw error;
    }
  };

  const updateUserProfile = async (data: any) => {
    if (!currentUser) throw new Error('Usuário não autenticado');
    
    try {
      const collectionName = userType === 'professional' ? 'profissionais' : 'empresas';
      await updateDoc(doc(db, collectionName, currentUser.uid), {
        ...data,
        updatedAt: new Date().toISOString()
      });
      
      // Atualizar estado local
      setUserData((prev: any) => ({ ...prev, ...data }));
      
      toast.success('Perfil atualizado com sucesso!');
    } catch (error: any) {
      console.error('Update profile error:', error);
      toast.error('Erro ao atualizar perfil');
      throw error;
    }
  };

  const loadUserData = async (uid: string) => {
    try {
      // Primeiro, verificar o tipo do usuário
      const userDoc = await getDoc(doc(db, 'users', uid));
      
      if (!userDoc.exists()) {
        console.error('User document not found');
        return;
      }

      const userTypeData = userDoc.data().type;
      setUserType(userTypeData);

      // Buscar dados específicos baseado no tipo
      const collectionName = userTypeData === 'professional' ? 'profissionais' : 'empresas';
      const userDataDoc = await getDoc(doc(db, collectionName, uid));

      if (userDataDoc.exists()) {
        setUserData(userDataDoc.data());
      }
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      
      if (user && user.emailVerified) {
        setCurrentUser(user);
        await loadUserData(user.uid);
      } else {
        setCurrentUser(null);
        setUserType(null);
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
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