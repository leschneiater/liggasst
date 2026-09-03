import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

export type UserRole = 'professional' | 'company' | 'admin';

interface AuthUser {
  id: string;
  email: string;
  type: UserRole;
  verified: boolean;
  email_confirmed_at?: string;
  created_at?: string;
  updated_at?: string;
  last_sign_in_at?: string;
}

interface ProfileRow {
  id: string;
  email: string;
  role: UserRole;
  display_name: string;
  phone: string | null;
  postal_code: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  avatar_path: string | null;
  verification_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  currentUser: AuthUser | null;
  userType: UserRole | null;
  userData: Record<string, unknown> | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    userData: Record<string, unknown>,
    type: 'professional' | 'company'
  ) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  uploadProfilePhoto: (file: File) => Promise<string>;
  updateUserProfile: (data: Record<string, unknown>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

const redirectForRole = (role: UserRole) => {
  if (role === 'company') return '/dashboard-empresa';
  if (role === 'admin') return '/admin';
  return '/dashboard-profissional';
};

const metadataForSignup = (
  data: Record<string, unknown>,
  role: 'professional' | 'company'
) => ({
  role,
  display_name: data.display_name ?? (role === 'company' ? data.nomeEmpresa : data.nome) ?? data.name,
  phone: data.telefone,
  postal_code: data.cep,
  city: data.cidade,
  state: data.estado,
  address: data.endereco,
  ...(role === 'professional'
    ? {
        cpf: data.cpf,
        education: data.formacao,
        specialization: data.especializacao,
        experience: data.experiencia,
        registration_number: data.registro,
        service_radius: data.raioAtendimento,
        hourly_rate: data.valorHora,
        availability: data.disponibilidade,
        description: data.descricao,
      }
    : {
        cnpj: data.cnpj,
        segment: data.segmento,
        employee_count: data.numeroFuncionarios,
        responsible_name: data.nomeResponsavel,
        responsible_role: data.cargoResponsavel,
        responsible_email: data.emailResponsavel,
        responsible_phone: data.telefoneResponsavel,
        description: data.descricaoEmpresa,
        needs: data.necessidades,
      }),
});

const toUserData = (
  profile: ProfileRow,
  details: Record<string, unknown> | null,
  authUser: SupabaseUser,
  photoURL?: string
) => {
  const base = {
    id: profile.id,
    email: authUser.email ?? profile.email,
    role: profile.role,
    type: profile.role,
    tipo: profile.role,
    telefone: profile.phone,
    cep: profile.postal_code,
    cidade: profile.city,
    estado: profile.state,
    endereco: profile.address,
    photoURL,
    avatarPath: profile.avatar_path,
    statusVerificacao: profile.verification_status,
    created_at: authUser.created_at,
    updated_at: authUser.updated_at,
    last_sign_in_at: authUser.last_sign_in_at,
    email_confirmed_at: authUser.email_confirmed_at,
  };

  if (profile.role === 'company') {
    return {
      ...base,
      nomeEmpresa: profile.display_name,
      cnpj: details?.cnpj,
      segmento: details?.segment,
      numeroFuncionarios: details?.employee_count,
      nomeResponsavel: details?.responsible_name,
      cargoResponsavel: details?.responsible_role,
      emailResponsavel: details?.responsible_email,
      telefoneResponsavel: details?.responsible_phone,
      descricaoEmpresa: details?.description,
      necessidades: details?.needs,
    };
  }

  return {
    ...base,
    nome: profile.display_name,
    cpf: details?.cpf,
    formacao: details?.education,
    especializacao: details?.specialization,
    experiencia: details?.experience,
    registro: details?.registration_number,
    raioAtendimento: details?.service_radius,
    valorHora: details?.hourly_rate,
    disponibilidade: details?.availability,
    descricao: details?.description,
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [userData, setUserData] = useState<Record<string, unknown> | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const clearUser = useCallback(() => {
    setCurrentUser(null);
    setUserData(null);
    setSession(null);
  }, []);

  const loadUser = useCallback(async (authUser: SupabaseUser) => {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single<ProfileRow>();

    if (profileError || !profile) {
      clearUser();
      throw new Error('Perfil da conta não foi encontrado. Entre em contato com o suporte.');
    }

    const detailsTable = profile.role === 'company' ? 'companies' : 'professionals';
    const { data: details, error: detailsError } = profile.role === 'admin'
      ? { data: null, error: null }
      : await supabase.from(detailsTable).select('*').eq('profile_id', authUser.id).maybeSingle();

    if (detailsError) throw detailsError;

    let photoURL: string | undefined;
    if (profile.avatar_path) {
      const { data } = await supabase.storage
        .from('profile-images')
        .createSignedUrl(profile.avatar_path, 3600);
      photoURL = data?.signedUrl;
    }

    const authProfile: AuthUser = {
      id: authUser.id,
      email: authUser.email ?? profile.email,
      type: profile.role,
      verified: Boolean(authUser.email_confirmed_at),
      email_confirmed_at: authUser.email_confirmed_at,
      created_at: authUser.created_at,
      updated_at: authUser.updated_at,
      last_sign_in_at: authUser.last_sign_in_at,
    };

    setCurrentUser(authProfile);
    setUserData(toUserData(profile, details as Record<string, unknown> | null, authUser, photoURL));
    return authProfile;
  }, [clearUser]);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;
      if (error) {
        clearUser();
        setLoading(false);
        return;
      }

      setSession(data.session);
      if (data.session?.user) {
        try {
          await loadUser(data.session.user);
        } catch (loadError) {
          console.error('Erro ao carregar perfil:', loadError);
        }
      } else {
        clearUser();
      }
      if (active) setLoading(false);
    };

    void hydrate();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      if (!nextSession?.user) {
        clearUser();
        setLoading(false);
        return;
      }

      setLoading(true);
      setTimeout(() => {
        void loadUser(nextSession.user)
          .catch((loadError) => console.error('Erro ao atualizar sessão:', loadError))
          .finally(() => active && setLoading(false));
      }, 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [clearUser, loadUser]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.user.email_confirmed_at) {
        await supabase.auth.signOut();
        throw new Error('Email not confirmed');
      }

      setSession(data.session);
      const profile = await loadUser(data.user);
      toast.success('Login realizado com sucesso!');
      navigate(redirectForRole(profile.type), { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('Email not confirmed')) {
        toast.error('Confirme seu e-mail antes de entrar.');
      } else if (message.includes('Invalid login credentials')) {
        toast.error('E-mail ou senha inválidos.');
      } else {
        toast.error(message || 'Não foi possível fazer login.');
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (
    email: string,
    password: string,
    data: Record<string, unknown>,
    type: 'professional' | 'company'
  ) => {
    setLoading(true);
    try {
      const file = (data.photoFile ?? data.logoFile) as File | undefined;
      const { data: signUpData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: metadataForSignup(data, type),
        },
      });
      if (error) throw error;
      if (!signUpData.user) throw new Error('Não foi possível criar a conta.');

      if (signUpData.session && file) {
        const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const path = `${signUpData.user.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from('profile-images')
          .upload(path, file, { upsert: false });
        if (!uploadError) {
          await supabase.from('profiles').update({ avatar_path: path }).eq('id', signUpData.user.id);
        }
      }

      if (signUpData.session) await supabase.auth.signOut();
      toast.success('Conta criada. Confirme seu e-mail para entrar.');
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      toast.error(message.includes('already registered')
        ? 'Não foi possível criar a conta com esses dados.'
        : message || 'Erro ao criar conta.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
      clearUser();
      navigate('/', { replace: true });
      toast.success('Logout realizado com sucesso!');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) throw error;
  };

  const resendVerification = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  };

  const uploadProfilePhoto = async (file: File) => {
    if (!currentUser) throw new Error('Usuário não autenticado.');
    if (file.size > 5 * 1024 * 1024) throw new Error('A imagem deve ter no máximo 5 MB.');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      throw new Error('Formato de imagem não permitido.');
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${currentUser.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from('profile-images')
      .upload(path, file, { upsert: false });
    if (uploadError) throw uploadError;

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ avatar_path: path })
      .eq('id', currentUser.id);
    if (profileError) throw profileError;

    const { data, error: signedUrlError } = await supabase.storage
      .from('profile-images')
      .createSignedUrl(path, 3600);
    if (signedUrlError) throw signedUrlError;

    setUserData((previous) => previous ? { ...previous, avatarPath: path, photoURL: data.signedUrl } : previous);
    return data.signedUrl;
  };

  const updateUserProfile = async (data: Record<string, unknown>) => {
    if (!currentUser) throw new Error('Usuário não autenticado.');

    const profileUpdate = {
      display_name: currentUser.type === 'company' ? data.nomeEmpresa : data.nome,
      phone: data.telefone,
      postal_code: data.cep,
      city: data.cidade,
      state: typeof data.estado === 'string' ? data.estado.toUpperCase() : data.estado,
      address: data.endereco,
    };

    const { error: profileError } = await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', currentUser.id);
    if (profileError) throw profileError;

    if (currentUser.type === 'professional') {
      const { error } = await supabase.from('professionals').update({
        cpf: data.cpf,
        education: data.formacao,
        specialization: data.especializacao,
        experience: data.experiencia,
        registration_number: data.registro,
        service_radius: data.raioAtendimento,
        hourly_rate: data.valorHora,
        availability: data.disponibilidade,
        description: data.descricao,
      }).eq('profile_id', currentUser.id);
      if (error) throw error;
    } else if (currentUser.type === 'company') {
      const { error } = await supabase.from('companies').update({
        cnpj: data.cnpj,
        segment: data.segmento,
        employee_count: data.numeroFuncionarios,
        responsible_name: data.nomeResponsavel,
        responsible_role: data.cargoResponsavel,
        responsible_email: data.emailResponsavel,
        responsible_phone: data.telefoneResponsavel,
        description: data.descricaoEmpresa,
        needs: data.necessidades,
      }).eq('profile_id', currentUser.id);
      if (error) throw error;
    }

    if (typeof data.email === 'string' && data.email !== currentUser.email) {
      const { error } = await supabase.auth.updateUser({ email: data.email });
      if (error) throw error;
      toast.success('Confirme o novo endereço de e-mail.');
    }

    const { data: authData } = await supabase.auth.getUser();
    if (authData.user) await loadUser(authData.user);
    toast.success('Perfil atualizado com sucesso!');
  };

  const value: AuthContextType = {
    currentUser,
    userType: currentUser?.type ?? null,
    userData,
    session,
    loading,
    login,
    signup,
    logout,
    resetPassword,
    resendVerification,
    updatePassword,
    uploadProfilePhoto,
    updateUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
