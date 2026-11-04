// Acesso a dados do modulo de trilhas (Etapas 1-2). RLS no banco e a fonte
// de verdade da visibilidade e do paywall; aqui so montamos as consultas.
import { supabase } from '../lib/supabase';
import { SecaoContentType, TrilhaKind } from '../utils/trilhas';
import { TrainingAudience } from '../utils/treinamentos';

export interface Trilha {
  id: string;
  titulo: string;
  descricao: string;
  audience: TrainingAudience;
  kind: TrilhaKind;
  published: boolean;
  is_test: boolean;
  ordem: number;
}

export interface SecaoTrilha {
  id: string;
  trail_id: string;
  ordem: number;
  titulo: string;
  content_type: SecaoContentType;
  conteudo: string;
}

export interface SeloPerfil {
  trail_id: string;
  trail_titulo: string;
  earned_at: string;
}

// ---------- Membro ----------

// Lista as trilhas visiveis para o membro logado com o resumo de progresso.
export const fetchTrilhasMembro = async () => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error('Sessão não encontrada.');

    const { data: trilhas, error } = await supabase
      .from('trails')
      .select('id, titulo, descricao, audience, kind, published, ordem')
      .order('ordem', { ascending: true })
      .order('titulo', { ascending: true });
    if (error) throw error;
    const lista = (trilhas ?? []) as Trilha[];
    if (lista.length === 0) return { success: true, data: [] as TrilhaComProgresso[] };

    const ids = lista.map((t) => t.id);
    const { data: secoes, error: erroSecoes } = await supabase
      .from('trail_sections')
      .select('id, trail_id')
      .in('trail_id', ids);
    if (erroSecoes) throw erroSecoes;

    const { data: progresso, error: erroProg } = await supabase
      .from('trail_section_progress')
      .select('section_id');
    if (erroProg) throw erroProg;

    const totalPorTrilha = new Map<string, number>();
    for (const s of (secoes ?? []) as { id: string; trail_id: string }[]) {
      totalPorTrilha.set(s.trail_id, (totalPorTrilha.get(s.trail_id) ?? 0) + 1);
    }
    const secaoParaTrilha = new Map<string, string>();
    for (const s of (secoes ?? []) as { id: string; trail_id: string }[]) {
      secaoParaTrilha.set(s.id, s.trail_id);
    }
    const feitasPorTrilha = new Map<string, Set<string>>();
    for (const p of (progresso ?? []) as { section_id: string }[]) {
      const trailId = secaoParaTrilha.get(p.section_id);
      if (!trailId) continue;
      if (!feitasPorTrilha.has(trailId)) feitasPorTrilha.set(trailId, new Set());
      feitasPorTrilha.get(trailId)!.add(p.section_id);
    }

    const data: TrilhaComProgresso[] = lista.map((t) => ({
      ...t,
      totalSecoes: totalPorTrilha.get(t.id) ?? 0,
      secoesConcluidas: feitasPorTrilha.get(t.id)?.size ?? 0,
    }));
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao carregar trilhas:', error);
    return { success: false, data: [] as TrilhaComProgresso[], error };
  }
};

export interface TrilhaComProgresso extends Trilha {
  totalSecoes: number;
  secoesConcluidas: number;
}

// Detalhe de uma trilha: secoes em ordem + quais o membro ja concluiu.
export const fetchTrilhaDetalhe = async (trailId: string) => {
  try {
    const { data: trilha, error } = await supabase
      .from('trails')
      .select('id, titulo, descricao, audience, kind, published, ordem')
      .eq('id', trailId)
      .maybeSingle();
    if (error) throw error;
    if (!trilha) return { success: false, data: null, error: new Error('Trilha não encontrada.') };

    const { data: secoes, error: erroSecoes } = await supabase
      .from('trail_sections')
      .select('id, trail_id, ordem, titulo, content_type, conteudo')
      .eq('trail_id', trailId)
      .order('ordem', { ascending: true });
    if (erroSecoes) throw erroSecoes;

    const { data: progresso, error: erroProg } = await supabase
      .from('trail_section_progress')
      .select('section_id');
    if (erroProg) throw erroProg;

    const concluidas = new Set(((progresso ?? []) as { section_id: string }[]).map((p) => p.section_id));
    return {
      success: true,
      data: {
        trilha: trilha as Trilha,
        secoes: (secoes ?? []) as SecaoTrilha[],
        concluidas,
      },
    };
  } catch (error) {
    console.error('Erro ao carregar trilha:', error);
    return { success: false, data: null, error };
  }
};

// Marca a secao como concluida. Responde se um selo NOVO nasceu (a conclusao
// em si e idempotente no banco; o selo e conferido pelo gatilho).
export const concluirSecao = async (trailId: string, sectionId: string) => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error('Sessão não encontrada.');

    const { data: seloAntes } = await supabase
      .from('profile_badges')
      .select('id')
      .eq('trail_id', trailId)
      .maybeSingle();

    const { error } = await supabase
      .from('trail_section_progress')
      .insert({ profile_id: userId, section_id: sectionId });
    // Par unico: se ja estava concluida, tratamos como sucesso idempotente.
    if (error && error.code !== '23505') throw error;

    const { data: seloDepois } = await supabase
      .from('profile_badges')
      .select('id')
      .eq('trail_id', trailId)
      .maybeSingle();

    return { success: true, seloNovo: !seloAntes && !!seloDepois };
  } catch (error) {
    console.error('Erro ao concluir seção:', error);
    return { success: false, seloNovo: false, error };
  }
};

// Selos do membro logado (area logada "meus selos").
export const fetchMeusSelos = async () => {
  try {
    const { data, error } = await supabase
      .from('profile_badges')
      .select('trail_id, earned_at, trails(titulo)')
      .order('earned_at', { ascending: false });
    if (error) throw error;
    const selos: SeloPerfil[] = ((data ?? []) as unknown as {
      trail_id: string;
      earned_at: string;
      trails: { titulo: string } | null;
    }[]).map((b) => ({
      trail_id: b.trail_id,
      trail_titulo: b.trails?.titulo ?? 'Trilha',
      earned_at: b.earned_at,
    }));
    return { success: true, data: selos };
  } catch (error) {
    console.error('Erro ao carregar selos:', error);
    return { success: false, data: [] as SeloPerfil[], error };
  }
};

// Selos exibidos na vitrine publica do profissional (RPC security definer;
// perfis de teste nunca aparecem).
export const fetchSelosPerfilPublico = async (profileId: string) => {
  try {
    const { data, error } = await supabase.rpc('profile_badges_publico', {
      p_profile_id: profileId,
    });
    if (error) throw error;
    return { success: true, data: (data ?? []) as SeloPerfil[] };
  } catch (error) {
    console.error('Erro ao carregar selos do perfil:', error);
    return { success: false, data: [] as SeloPerfil[], error };
  }
};

// PDF da secao via Edge Function (mesmo gate pago dos treinamentos).
export const getSecaoTrilhaPdfUrl = async (sectionId: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('training-file-url', {
      body: { trail_section_id: sectionId },
    });
    if (error) throw error;
    if (!data?.signedUrl) throw new Error('Link não retornado.');
    return { success: true, signedUrl: data.signedUrl as string };
  } catch (error) {
    console.error('Erro ao abrir PDF da seção:', error);
    return { success: false, error };
  }
};

// ---------- Admin ----------

export const fetchTrilhasAdmin = async () => {
  try {
    const { data: trilhas, error } = await supabase
      .from('trails')
      .select('id, titulo, descricao, audience, kind, published, is_test, ordem')
      .order('ordem', { ascending: true })
      .order('titulo', { ascending: true });
    if (error) throw error;
    const lista = (trilhas ?? []) as Trilha[];
    if (lista.length === 0) return { success: true, data: [] as TrilhaAdmin[] };

    const { data: secoes, error: erroSecoes } = await supabase
      .from('trail_sections')
      .select('id, trail_id')
      .in('trail_id', lista.map((t) => t.id));
    if (erroSecoes) throw erroSecoes;
    const totalPorTrilha = new Map<string, number>();
    for (const s of (secoes ?? []) as { id: string; trail_id: string }[]) {
      totalPorTrilha.set(s.trail_id, (totalPorTrilha.get(s.trail_id) ?? 0) + 1);
    }
    return {
      success: true,
      data: lista.map((t) => ({ ...t, totalSecoes: totalPorTrilha.get(t.id) ?? 0 })) as TrilhaAdmin[],
    };
  } catch (error) {
    console.error('Erro ao carregar trilhas (admin):', error);
    return { success: false, data: [] as TrilhaAdmin[], error };
  }
};

export interface TrilhaAdmin extends Trilha {
  totalSecoes: number;
}

export const createTrilha = async (trilha: {
  titulo: string;
  descricao: string;
  audience: TrainingAudience;
  kind: TrilhaKind;
}) => {
  try {
    const { data, error } = await supabase
      .from('trails')
      .insert({ ...trilha, published: false })
      .select()
      .single();
    if (error) throw error;
    return { success: true, data: data as Trilha };
  } catch (error) {
    console.error('Erro ao criar trilha:', error);
    return { success: false, data: null, error };
  }
};

export const updateTrilha = async (id: string, campos: Partial<Trilha>) => {
  try {
    const { data, error } = await supabase
      .from('trails')
      .update(campos)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return { success: true, data: data as Trilha };
  } catch (error) {
    console.error('Erro ao atualizar trilha:', error);
    return { success: false, data: null, error };
  }
};

export const deleteTrilha = async (id: string) => {
  try {
    const { error } = await supabase.from('trails').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao excluir trilha:', error);
    return { success: false, error };
  }
};

export const fetchSecoesAdmin = async (trailId: string) => {
  try {
    const { data, error } = await supabase
      .from('trail_sections')
      .select('id, trail_id, ordem, titulo, content_type, conteudo')
      .eq('trail_id', trailId)
      .order('ordem', { ascending: true });
    if (error) throw error;
    return { success: true, data: (data ?? []) as SecaoTrilha[] };
  } catch (error) {
    console.error('Erro ao carregar seções:', error);
    return { success: false, data: [] as SecaoTrilha[], error };
  }
};

export const createSecao = async (secao: {
  // id opcional: secoes de PDF nascem com id definido no cliente para que o
  // path do arquivo (<id>.pdf) ja seja conhecido no insert.
  id?: string;
  trail_id: string;
  ordem: number;
  titulo: string;
  content_type: SecaoContentType;
  conteudo: string;
}) => {
  try {
    const { data, error } = await supabase
      .from('trail_sections')
      .insert(secao)
      .select()
      .single();
    if (error) throw error;
    return { success: true, data: data as SecaoTrilha };
  } catch (error) {
    console.error('Erro ao criar seção:', error);
    return { success: false, data: null, error };
  }
};

export const deleteSecao = async (id: string) => {
  try {
    const { error } = await supabase.from('trail_sections').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao excluir seção:', error);
    return { success: false, error };
  }
};

// PDF da secao: mesmo bucket privado dos treinamentos, path <uuid>.pdf
// (a coluna conteudo guarda esse path para content_type 'pdf').
export const uploadSecaoPdf = async (sectionId: string, file: File) => {
  try {
    if (file.type !== 'application/pdf') throw new Error('Apenas PDF.');
    if (file.size > 10 * 1024 * 1024) throw new Error('PDF acima de 10 MB.');
    const path = `${sectionId}.pdf`;
    const { error } = await supabase.storage
      .from('trainings')
      .upload(path, file, { upsert: true, contentType: 'application/pdf' });
    if (error) throw error;
    return { success: true, path };
  } catch (error) {
    console.error('Erro ao enviar PDF da seção:', error);
    return { success: false, error };
  }
};
