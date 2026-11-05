// Etapa 5 das trilhas: certificado de conclusao (pedido dela 05/11).
// Emissao so pela RPC trail_certificado_emitir (valida aprovacao no servidor,
// idempotente por perfil+trilha). Verificacao publica pela RPC
// trail_certificado_verificar, que devolve apenas os campos impressos no
// certificado — anon nao le a tabela trail_certificates.
import { supabase } from '../lib/supabase';

export interface CertificadoTrilha {
  id: string;
  profile_id: string;
  trail_id: string;
  codigo: string;
  nome: string;
  trilha_titulo: string;
  carga_horaria_min: number | null;
  nota: number;
  emitido_em: string;
}

export interface VerificacaoCertificado {
  valido: boolean;
  codigo?: string;
  nome?: string;
  trilha_titulo?: string;
  carga_horaria_min?: number | null;
  nota?: number;
  emitido_em?: string;
}

// Emite (ou devolve o ja emitido) o certificado da trilha para o membro
// logado. Erros conhecidos viram mensagem amigavel.
export const emitirCertificado = async (trailId: string): Promise<CertificadoTrilha> => {
  const { data, error } = await supabase.rpc('trail_certificado_emitir', { p_trail: trailId });
  if (error) {
    if (error.message.includes('aprovacao')) throw new Error('O certificado é liberado após a aprovação na avaliação.');
    if (error.message.includes('sem certificado')) throw new Error('Esta trilha não emite certificado.');
    throw new Error('Não foi possível emitir o certificado agora. Tente novamente.');
  }
  return data as CertificadoTrilha;
};

// Verificacao publica pelo codigo impresso no certificado. Funciona sem login.
export const verificarCertificado = async (codigo: string): Promise<VerificacaoCertificado> => {
  const { data, error } = await supabase.rpc('trail_certificado_verificar', { p_codigo: codigo });
  if (error) throw new Error('Não foi possível verificar agora. Tente novamente.');
  return data as VerificacaoCertificado;
};

// Texto do rodape impresso em todo certificado (aprovado por ela em 04/11,
// ajustado em 05/11: conclusao na plataforma, sem validade como certificacao
// profissional, sem curador/assinatura).
export const RODAPE_CERTIFICADO =
  'Certificado de conclusão de curso livre na plataforma Ligga SST, sem validade como certificação profissional. ' +
  'Curso livre de educação não formal; não confere diploma, não habilita ao exercício de profissão regulamentada ' +
  'e não substitui os treinamentos que as Normas Regulamentadoras exigem do empregador.';

export const URL_VERIFICACAO = 'https://leschneiater.github.io/liggasst/verificar-certificado';

export const formatarCargaHoraria = (min: number | null): string | null => {
  if (!min) return null;
  if (min % 60 === 0) return `${min / 60}h`;
  return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`;
};
