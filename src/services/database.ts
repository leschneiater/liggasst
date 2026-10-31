import { supabase } from '../lib/supabase';
import { TrainingAudience, TrainingStatus, treinamentoVisivelPara } from '../utils/treinamentos';

type Filters = Record<string, unknown>;
type ProfileData = Record<string, unknown>;

const getAuthenticatedUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw error ?? new Error('Usuário não autenticado.');
  return data.user;
};

// PostgREST corta em 1000 linhas por resposta; relatorios e contagens de
// admin precisam varrer todas as paginas para nao truncar resultado.
const PAGINA = 1000;
const fetchTodasPaginas = async <T>(
  buscar: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<{ data: T[]; error: unknown | null }> => {
  const todas: T[] = [];
  let de = 0;
  for (;;) {
    const { data, error } = await buscar(de, de + PAGINA - 1);
    if (error) return { data: todas, error };
    const linhas = data || [];
    todas.push(...linhas);
    if (linhas.length < PAGINA) return { data: todas, error: null };
    de += PAGINA;
  }
};

export const fetchProfessionals = async (filters: Filters = {}) => {
  try {
    const { data, error } = await supabase.rpc('search_professionals', {
      p_state: filters.estado ?? filters.state ?? null,
      p_city: filters.cidade ?? filters.city ?? null,
      p_specialization: filters.especializacao ?? filters.specialization ?? null,
    });
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao buscar profissionais:', error);
    return { success: false, error };
  }
};

export interface ProfessionalSearchRow {
  professional_id?: string;
  id?: string;
  display_name: string | null;
  education: string | null;
  specialization: string | null;
  experience: string | null;
  city: string | null;
  state: string | null;
  hourly_rate: number | null;
  service_radius: string | null;
  description: string | null;
  availability: string[] | null;
  avatar_path: string | null;
}

export interface ProfessionalSearchItem {
  id: string;
  nome: string;
  formacao: string;
  cidade: string;
  estado: string;
  experiencia: number | null;
  valorHora: number | null;
  raioAtendimento: number | null;
  especializacoes: string[];
  disponibilidade: string[];
  descricao: string;
}

const parseLeadingInt = (value: string | null): number | null => {
  if (!value) return null;
  const match = value.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
};

export const mapProfessionalSearchRow = (row: ProfessionalSearchRow): ProfessionalSearchItem => ({
  id: row.professional_id ?? row.id ?? '',
  nome: row.display_name || 'Profissional',
  formacao: row.education || '',
  cidade: row.city || '',
  estado: row.state || '',
  experiencia: parseLeadingInt(row.experience),
  valorHora: row.hourly_rate ?? null,
  raioAtendimento: parseLeadingInt(row.service_radius),
  especializacoes: (row.specialization || '')
    .split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0),
  disponibilidade: row.availability ?? [],
  descricao: row.description || ''
});

export const searchProfessionals = async (params: {
  state?: string;
  city?: string;
  specialization?: string;
}): Promise<ProfessionalSearchItem[]> => {
  const { data, error } = await supabase.rpc('search_professionals', {
    p_state: params.state ?? null,
    p_city: params.city ?? null,
    p_specialization: params.specialization ?? null,
  });
  if (error) throw error;
  return ((data ?? []) as ProfessionalSearchRow[]).map(mapProfessionalSearchRow);
};

export const getProfessionalPublic = async (id: string): Promise<ProfessionalSearchItem | null> => {
  const { data, error } = await supabase.rpc('get_professional_public', { p_id: id });
  if (error) throw error;
  const row = ((data ?? []) as ProfessionalSearchRow[])[0];
  return row ? mapProfessionalSearchRow(row) : null;
};

export const fetchCompanies = async (filters: Filters = {}) => {
  try {
    const { data, error } = await supabase.rpc('search_companies', {
      p_state: filters.estado ?? filters.state ?? null,
      p_city: filters.cidade ?? filters.city ?? null,
      p_segment: filters.segmento ?? filters.segment ?? null,
    });
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao buscar empresas:', error);
    return { success: false, error };
  }
};

export const fetchContracts = async () => {
  try {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao buscar contratos:', error);
    return { success: false, error };
  }
};

export const saveUserProfile = async (userId: string, profileData: ProfileData) => {
  try {
    const user = await getAuthenticatedUser();
    if (user.id !== userId) throw new Error('Não é permitido editar outro perfil.');

    const allowedFields = ['display_name', 'phone', 'postal_code', 'city', 'state', 'address', 'avatar_path'];
    const sanitized = Object.fromEntries(
      Object.entries(profileData).filter(([key]) => allowedFields.includes(key))
    );
    const { error } = await supabase.from('profiles').update(sanitized).eq('id', user.id);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao salvar perfil:', error);
    return { success: false, error };
  }
};

export const fetchUserProfile = async (userId: string) => {
  try {
    const user = await getAuthenticatedUser();
    if (user.id !== userId) throw new Error('Não é permitido acessar outro perfil privado.');
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    return { success: false, error };
  }
};


export const fetchOwnCompany = async (profileId: string) => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('profile_id', profileId)
      .maybeSingle();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao buscar empresa:', error);
    return { success: false, error };
  }
};

export const updateCompany = async (profileId: string, companyData: ProfileData) => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .update(companyData)
      .eq('profile_id', profileId)
      .select()
      .single();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao atualizar empresa:', error);
    return { success: false, error };
  }
};

export const sendMessage = async (senderId: string, receiverId: string, content: string) => {
  try {
    const user = await getAuthenticatedUser();
    if (user.id !== senderId) throw new Error('Remetente inválido.');
    const { data, error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: receiverId,
      content,
    }).select().single();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    return { success: false, error };
  }
};

export const fetchMessages = async () => {
  try {
    await getAuthenticatedUser();
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    return { success: false, error };
  }
};

export const markMessageAsRead = async (messageId: string) => {
  try {
    await getAuthenticatedUser();
    const { error } = await supabase.from('messages').update({ read: true }).eq('id', messageId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao marcar mensagem como lida:', error);
    return { success: false, error };
  }
};

// Bloqueio entre usuarios (conversation_blocks)
export const fetchMyBlocks = async () => {
  try {
    const user = await getAuthenticatedUser();
    const { data, error } = await supabase
      .from('conversation_blocks')
      .select('blocked_id')
      .eq('blocker_id', user.id);
    if (error) throw error;
    return { success: true, data: (data || []) as { blocked_id: string }[] };
  } catch (error) {
    console.error('Erro ao buscar bloqueios:', error);
    return { success: false, data: [] as { blocked_id: string }[], error };
  }
};

export const blockUser = async (blockedId: string) => {
  try {
    const user = await getAuthenticatedUser();
    const { error } = await supabase
      .from('conversation_blocks')
      .insert({ blocker_id: user.id, blocked_id: blockedId });
    if (error && error.code !== '23505') throw error; // ignora duplicado
    return { success: true };
  } catch (error) {
    console.error('Erro ao bloquear usuário:', error);
    return { success: false, error };
  }
};

export const unblockUser = async (blockedId: string) => {
  try {
    const user = await getAuthenticatedUser();
    const { error } = await supabase
      .from('conversation_blocks')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', blockedId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao desbloquear usuário:', error);
    return { success: false, error };
  }
};

// Denuncia para a administracao (message_reports)
export const reportUser = async (reportedId: string, reason: string, details: string, messageId?: string) => {
  try {
    const user = await getAuthenticatedUser();
    const { error } = await supabase
      .from('message_reports')
      .insert({
        reporter_id: user.id,
        reported_id: reportedId,
        reason,
        details: details || null,
        message_id: messageId || null
      });
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao registrar denúncia:', error);
    return { success: false, error };
  }
};

// Denuncias - administracao (RLS: so is_admin ve todas e atualiza)
export interface ReportRow {
  id: string;
  reporter_id: string;
  reported_id: string;
  message_id: string | null;
  reason: string;
  details: string | null;
  status: 'open' | 'reviewed' | 'actioned';
  created_at: string;
}

export const fetchReports = async () => {
  try {
    await getAuthenticatedUser();
    const { data, error } = await fetchTodasPaginas<ReportRow>((de, ate) =>
      supabase
        .from('message_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .range(de, ate)
    );
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao buscar denúncias:', error);
    return { success: false, data: [] as ReportRow[], error };
  }
};

export const updateReportStatus = async (reportId: string, status: 'reviewed' | 'actioned') => {
  try {
    await getAuthenticatedUser();
    const { error } = await supabase
      .from('message_reports')
      .update({ status })
      .eq('id', reportId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao atualizar denúncia:', error);
    return { success: false, error };
  }
};

// Nomes de perfis para a administracao (profiles_select permite is_admin)
export const fetchProfileNames = async (ids: string[]) => {
  try {
    await getAuthenticatedUser();
    if (ids.length === 0) return { success: true, data: {} as Record<string, string> };
    const mapa: Record<string, string> = {};
    // .in() tambem tem limite pratico; envia em lotes de 200 ids
    for (let i = 0; i < ids.length; i += 200) {
      const lote = ids.slice(i, i + 200);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', lote);
      if (error) throw error;
      for (const p of (data || []) as { id: string; display_name: string }[]) {
        mapa[p.id] = p.display_name;
      }
    }
    return { success: true, data: mapa };
  } catch (error) {
    console.error('Erro ao buscar nomes:', error);
    return { success: false, data: {} as Record<string, string>, error };
  }
};

export const getProfilePublic = async (id: string) => {
  try {
    await getAuthenticatedUser();
    const { data, error } = await supabase.rpc('get_profile_public', { p_id: id }).maybeSingle();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao buscar perfil público:', error);
    return { success: false, error };
  }
};

export const publishDemand = async (demandData: ProfileData) => {
  try {
    const user = await getAuthenticatedUser();
    const { data, error } = await supabase.from('demands').insert({
      ...demandData,
      company_id: user.id,
      status: 'active',
    }).select().single();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao publicar demanda:', error);
    return { success: false, error };
  }
};

export const fetchDemands = async (filters: Filters = {}) => {
  try {
    // Paginada como as leituras do admin: relatorios e paineis nao podem
    // truncar silenciosamente no limite padrao de linhas.
    const { data, error } = await fetchTodasPaginas((de, ate) => {
      let query = supabase.from('demands').select('*');
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null && value !== '') query = query.eq(key, value);
      }
      return query.order('created_at', { ascending: false }).range(de, ate);
    });
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao buscar demandas:', error);
    return { success: false, error };
  }
};

// Allowlist de campos gravaveis pelo cliente: company_id, ids, created_at e
// qualquer coluna fora da lista nunca sao escritos a partir do app.
const CAMPOS_EDITAVEIS_DEMANDA = new Set([
  'title', 'description', 'service_type', 'city', 'state', 'budget',
  'deadline', 'modalidade', 'urgencia', 'tipo_orcamento', 'status',
]);

export type UpdateDemandResult =
  | { success: true; data: unknown }
  | { success: false; conflict?: boolean; error: unknown };

export const updateDemand = async (
  id: string,
  campos: Record<string, unknown>,
): Promise<UpdateDemandResult> => {
  try {
    const seguro: Record<string, unknown> = {};
    for (const [campo, valor] of Object.entries(campos)) {
      if (CAMPOS_EDITAVEIS_DEMANDA.has(campo)) seguro[campo] = valor;
    }
    if (Object.keys(seguro).length === 0) throw new Error('Nenhum campo editável informado');
    const user = await getAuthenticatedUser();
    // Dono e status 'active' entram no PROPRIO update (checagem atomica, nao
    // so na leitura anterior da tela): um formulario aberto sobre uma demanda
    // ja encerrada resulta em 0 linhas (conflito), nunca em sobrescrita. A
    // policy demands_update reforca o dono no banco.
    const { data, error } = await supabase
      .from('demands')
      .update(seguro)
      .eq('id', id)
      .eq('company_id', user.id)
      .eq('status', 'active')
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return {
        success: false,
        conflict: true,
        error: new Error('Demanda não está ativa ou não pertence à empresa logada'),
      };
    }
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao atualizar demanda:', error);
    return { success: false, error };
  }
};

export interface Certificate {
  id: string;
  professional_id: string;
  name: string;
  issuer: string | null;
  issued_at: string | null;
  expires_at: string | null;
  storage_path: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  visible_to_companies: boolean;
  created_at: string;
}

export const fetchMyCertificates = async () => {
  try {
    const user = await getAuthenticatedUser();
    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('professional_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao buscar certificados:', error);
    return { success: false, error };
  }
};

export const createCertificate = async (certificate: {
  name: string;
  issuer?: string | null;
  issued_at?: string | null;
  expires_at?: string | null;
  storage_path: string;
  visible_to_companies?: boolean;
}) => {
  try {
    const user = await getAuthenticatedUser();
    const { data, error } = await supabase
      .from('certificates')
      .insert({
        professional_id: user.id,
        name: certificate.name,
        issuer: certificate.issuer ?? null,
        issued_at: certificate.issued_at ?? null,
        expires_at: certificate.expires_at ?? null,
        storage_path: certificate.storage_path,
        status: 'pending',
        visible_to_companies: certificate.visible_to_companies ?? false,
      })
      .select()
      .single();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao registrar certificado:', error);
    return { success: false, error };
  }
};

export const getCertificateSignedUrl = async (storagePath: string) => {
  try {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(storagePath, 3600);
    if (error) throw error;
    return { success: true, signedUrl: data.signedUrl };
  } catch (error) {
    console.error('Erro ao gerar link do certificado:', error);
    return { success: false, error };
  }
};

export const setCertificateVisibility = async (certificateId: string, visible: boolean) => {
  try {
    const user = await getAuthenticatedUser();
    const { error } = await supabase
      .from('certificates')
      .update({ visible_to_companies: visible })
      .eq('id', certificateId)
      .eq('professional_id', user.id);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao alterar visibilidade do certificado:', error);
    return { success: false, error };
  }
};

export interface SharedCertificate {
  id: string;
  name: string;
  issuer: string | null;
  issued_at: string | null;
  expires_at: string | null;
}

export const fetchSharedCertificates = async (professionalId: string) => {
  try {
    const { data, error } = await supabase.rpc('get_professional_shared_certificates', {
      p_professional_id: professionalId,
    });
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao buscar certificados compartilhados:', error);
    return { success: false, error };
  }
};

export const getSharedCertificateUrl = async (certificateId: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('shared-certificate-url', {
      body: { certificate_id: certificateId },
    });
    if (error) throw error;
    if (!data?.signedUrl) throw new Error('Link não retornado.');
    return { success: true, signedUrl: data.signedUrl as string };
  } catch (error) {
    console.error('Erro ao abrir certificado compartilhado:', error);
    return { success: false, error };
  }
};

// Depende da policy certificates_delete (rascunho em supabase/drafts, não aplicada).
export const deleteCertificate = async (certificateId: string, storagePath: string) => {
  try {
    const user = await getAuthenticatedUser();
    const { data, error } = await supabase
      .from('certificates')
      .delete()
      .eq('id', certificateId)
      .eq('professional_id', user.id)
      .select('id');
    if (error) throw error;
    // delete sem linha afetada (id inexistente ou de outro dono) e falha:
    // NAO remove o objeto do storage
    if (!data || data.length === 0) throw new Error('Certificado não encontrado.');
    const { error: storageError } = await supabase.storage.from('documents').remove([storagePath]);
    if (storageError) {
      console.error('Linha removida, mas o arquivo ficou no storage:', storageError);
      return { success: true, warning: 'storage' };
    }
    return { success: true };
  } catch (error) {
    console.error('Erro ao excluir certificado:', error);
    return { success: false, error };
  }
};

// Visao administrativa real para o painel e exportacao (RLS: is_admin le tudo)
export interface AdminOverview {
  totalProfissionais: number;
  totalEmpresas: number;
  novosProfissionaisPeriodo: number;
  novasEmpresasPeriodo: number;
  demandasPeriodo: number;
  denunciasAbertas: number;
  denunciasPeriodo: number;
}

export const fetchAdminOverview = async (desdeISO: string) => {
  try {
    await getAuthenticatedUser();
    const [perfis, demandas, denuncias] = await Promise.all([
      fetchTodasPaginas<{ role: string; created_at: string; is_test: boolean }>((de, ate) =>
        supabase.from('profiles').select('id, role, created_at, is_test').range(de, ate)),
      fetchTodasPaginas<{ created_at: string }>((de, ate) =>
        supabase.from('demands').select('id, created_at').range(de, ate)),
      fetchTodasPaginas<{ status: string; created_at: string }>((de, ate) =>
        supabase.from('message_reports').select('id, status, created_at').range(de, ate)),
    ]);
    if (perfis.error) throw perfis.error;
    if (demandas.error) throw demandas.error;
    if (denuncias.error) throw denuncias.error;
    const desde = new Date(desdeISO).getTime();
    const noPeriodo = (created_at: string) => new Date(created_at).getTime() >= desde;
    // mesma elegibilidade das listas: perfis de teste ficam fora; admin nao
    // entra porque os contadores filtram pelos papeis professional/company
    const linhas = perfis.data.filter(p => !p.is_test);
    const data: AdminOverview = {
      totalProfissionais: linhas.filter(p => p.role === 'professional').length,
      totalEmpresas: linhas.filter(p => p.role === 'company').length,
      novosProfissionaisPeriodo: linhas.filter(p => p.role === 'professional' && noPeriodo(p.created_at)).length,
      novasEmpresasPeriodo: linhas.filter(p => p.role === 'company' && noPeriodo(p.created_at)).length,
      demandasPeriodo: demandas.data.filter(d => noPeriodo(d.created_at)).length,
      denunciasAbertas: denuncias.data.filter(d => d.status === 'open').length,
      denunciasPeriodo: denuncias.data.filter(d => noPeriodo(d.created_at)).length,
    };
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao buscar visão administrativa:', error);
    return { success: false, data: null as AdminOverview | null, error };
  }
};

// Relatorio administrativo completo (RLS: is_admin le tudo abaixo)
export interface AdminMemberRow {
  id: string;
  role: string;
  display_name: string;
  email: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  created_at: string;
  education: string | null;
  specialization: string | null;
  experience: string | null;
  hourly_rate: number | null;
  segment: string | null;
  employee_count: string | null;
  responsible_name: string | null;
  responsible_email: string | null;
  responsible_phone: string | null;
}

export const fetchAdminMembers = async () => {
  try {
    await getAuthenticatedUser();
    const [perfis, profs, emps] = await Promise.all([
      fetchTodasPaginas<Record<string, unknown>>((de, ate) =>
        supabase.from('profiles').select('id, role, display_name, email, phone, city, state, created_at, is_test').range(de, ate)),
      fetchTodasPaginas<Record<string, unknown>>((de, ate) =>
        supabase.from('professionals').select('profile_id, education, specialization, experience, hourly_rate').range(de, ate)),
      fetchTodasPaginas<Record<string, unknown>>((de, ate) =>
        supabase.from('companies').select('profile_id, segment, employee_count, responsible_name, responsible_email, responsible_phone').range(de, ate)),
    ]);
    if (perfis.error) throw perfis.error;
    if (profs.error) throw profs.error;
    if (emps.error) throw emps.error;
    const mapaProf = new Map(profs.data.map(p => [p.profile_id, p]));
    const mapaEmp = new Map(emps.data.map(e => [e.profile_id, e]));
    // perfis de teste ficam fora do relatorio (mesma regra das buscas)
    const data: AdminMemberRow[] = (perfis.data.filter(p => !p.is_test) as Record<string, unknown>[]).map(p => {
      const prof = mapaProf.get(p.id) as Record<string, unknown> | undefined;
      const emp = mapaEmp.get(p.id) as Record<string, unknown> | undefined;
      return {
        id: p.id as string,
        role: p.role as string,
        display_name: (p.display_name as string) || '',
        email: (p.email as string) || '',
        phone: (p.phone as string | null) ?? null,
        city: (p.city as string | null) ?? null,
        state: (p.state as string | null) ?? null,
        created_at: p.created_at as string,
        education: (prof?.education as string | null) ?? null,
        specialization: (prof?.specialization as string | null) ?? null,
        experience: (prof?.experience as string | null) ?? null,
        hourly_rate: (prof?.hourly_rate as number | null) ?? null,
        segment: (emp?.segment as string | null) ?? null,
        employee_count: (emp?.employee_count as string | null) ?? null,
        responsible_name: (emp?.responsible_name as string | null) ?? null,
        responsible_email: (emp?.responsible_email as string | null) ?? null,
        responsible_phone: (emp?.responsible_phone as string | null) ?? null,
      };
    });
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao buscar membros para o relatório:', error);
    return { success: false, data: [] as AdminMemberRow[], error };
  }
};

export interface AdminDemandRow {
  id: string;
  title: string;
  company_id: string;
  service_type: string | null;
  city: string | null;
  state: string | null;
  budget: number | null;
  deadline: string | null;
  status: string;
  created_at: string;
}

export const fetchAdminDemands = async () => {
  try {
    await getAuthenticatedUser();
    const { data, error } = await fetchTodasPaginas<AdminDemandRow>((de, ate) =>
      supabase
        .from('demands')
        .select('id, title, company_id, service_type, city, state, budget, deadline, status, created_at')
        .order('created_at', { ascending: false })
        .range(de, ate)
    );
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao buscar demandas para o relatório:', error);
    return { success: false, data: [] as AdminDemandRow[], error };
  }
};

// =====================
// Treinamentos (módulo admin) — depende do rascunho supabase/drafts/draft_trainings.sql
// (não aplicado) e da Edge Function training-file-url (preparada, não implantada).
// =====================

export { treinamentoVisivelPara };
export type { TrainingAudience, TrainingStatus };

export const fetchTrainingsAdmin = async () => {
  try {
    await getAuthenticatedUser();
    // leitura paginada como as demais consultas admin (completa, sem teto de 1000)
    const { data, error } = await fetchTodasPaginas<TrainingRow>((de, ate) =>
      supabase
        .from('trainings')
        .select('*')
        .order('created_at', { ascending: false })
        .range(de, ate)
    );
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao buscar treinamentos (admin):', error);
    return { success: false, data: [] as TrainingRow[], error };
  }
};

// Leitura do membro: a RLS já devolve só os publicados do público dele.
export const fetchTrainingsMembro = async () => {
  try {
    const { data, error } = await supabase
      .from('trainings')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { success: true, data: (data ?? []) as TrainingRow[] };
  } catch (error) {
    console.error('Erro ao buscar treinamentos:', error);
    return { success: false, data: [] as TrainingRow[], error };
  }
};

export const createTraining = async (treinamento: {
  title: string;
  description?: string;
  audience: TrainingAudience;
  youtube_url?: string | null;
  pdf_path?: string | null;
  link_url?: string | null;
  status?: TrainingStatus;
}) => {
  try {
    const user = await getAuthenticatedUser();
    const { data, error } = await supabase
      .from('trainings')
      .insert({
        title: treinamento.title,
        description: treinamento.description ?? '',
        audience: treinamento.audience,
        youtube_url: treinamento.youtube_url ?? null,
        pdf_path: treinamento.pdf_path ?? null,
        link_url: treinamento.link_url ?? null,
        status: treinamento.status ?? 'draft',
        created_by: user.id,
      })
      .select()
      .single();
    if (error) throw error;
    return { success: true, data: data as TrainingRow };
  } catch (error) {
    console.error('Erro ao criar treinamento:', error);
    return { success: false, error };
  }
};

export const updateTraining = async (
  id: string,
  mudancas: Partial<Pick<TrainingRow, 'title' | 'description' | 'audience' | 'youtube_url' | 'pdf_path' | 'link_url' | 'status'>>,
) => {
  try {
    const { data, error } = await supabase
      .from('trainings')
      .update({ ...mudancas, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return { success: true, data: data as TrainingRow };
  } catch (error) {
    console.error('Erro ao atualizar treinamento:', error);
    return { success: false, error };
  }
};

export const uploadTrainingPdf = async (trainingId: string, file: File) => {
  try {
    if (file.type !== 'application/pdf') throw new Error('Apenas PDF.');
    if (file.size > 10 * 1024 * 1024) throw new Error('PDF acima de 10 MB.');
    const path = `${trainingId}.pdf`;
    const { error } = await supabase.storage
      .from('trainings')
      .upload(path, file, { upsert: true, contentType: 'application/pdf' });
    if (error) throw error;
    return { success: true, path };
  } catch (error) {
    console.error('Erro ao enviar PDF do treinamento:', error);
    return { success: false, error };
  }
};

// Membro (e admin) abrem o PDF via Edge Function, que confere papel/público
// antes de assinar. URL assinada tem validade curta e não é DRM.
export const getTrainingPdfUrl = async (trainingId: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('training-file-url', {
      body: { training_id: trainingId },
    });
    if (error) throw error;
    if (!data?.signedUrl) throw new Error('Link não retornado.');
    return { success: true, signedUrl: data.signedUrl as string };
  } catch (error) {
    console.error('Erro ao abrir PDF do treinamento:', error);
    return { success: false, error };
  }
};

export const deleteTraining = async (id: string, pdfPath: string | null) => {
  try {
    const { data, error } = await supabase
      .from('trainings')
      .delete()
      .eq('id', id)
      .select('id');
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Treinamento não encontrado.');
    // Só remove paths no formato gerado pelo upload (<uuid>.pdf): nunca
    // apaga caminho arbitrário do bucket (inclusive PDF de outro treinamento).
    if (pdfPath && /^[0-9a-f-]{36}\.pdf$/.test(pdfPath)) {
      const { error: storageError } = await supabase.storage.from('trainings').remove([pdfPath]);
      if (storageError) {
        console.error('Linha removida, mas o PDF ficou no storage:', storageError);
        return { success: true, warning: 'storage' };
      }
    }
    return { success: true };
  } catch (error) {
    console.error('Erro ao excluir treinamento:', error);
    return { success: false, error };
  }
};
