// Contato: o visitante envia pela edge function contato-enviar (grava a mensagem);
// a admin le, marca e exclui pela tabela, com RLS de admin.
import { supabase } from '../lib/supabase';

export interface DadosContato {
  nome: string; email: string; telefone: string; empresa: string; assunto: string; mensagem: string;
  site?: string; // campo-isca, deve ir vazio
}
export type ResultadoEnvio = { ok: true } | { ok: false; motivo: 'invalido' | 'limite' | 'falha' };

export async function enviarContato(d: DadosContato): Promise<ResultadoEnvio> {
  try {
    const { data, error } = await supabase.functions.invoke('contato-enviar', { body: d });
    if (error) {
      const status = (error as { context?: { status?: number } }).context?.status;
      return { ok: false, motivo: status === 400 ? 'invalido' : status === 429 ? 'limite' : 'falha' };
    }
    return (data as { ok?: boolean })?.ok ? { ok: true } : { ok: false, motivo: 'falha' };
  } catch {
    return { ok: false, motivo: 'falha' };
  }
}

export type StatusContato = 'nova' | 'respondida' | 'spam';
export interface MensagemContato {
  id: string; created_at: string; nome: string; email: string; telefone: string | null;
  empresa: string | null; assunto: string; mensagem: string; status: StatusContato;
}

export async function adminListarContatos(): Promise<{ ok: boolean; itens: MensagemContato[] }> {
  const { data, error } = await supabase.from('contato_mensagens').select('*').order('created_at', { ascending: false }).limit(200);
  return error ? { ok: false, itens: [] } : { ok: true, itens: (data ?? []) as MensagemContato[] };
}
export async function adminMarcarContato(id: string, status: StatusContato): Promise<boolean> {
  const { error } = await supabase.from('contato_mensagens').update({ status, status_at: new Date().toISOString() }).eq('id', id);
  return !error;
}
export async function adminExcluirContato(id: string): Promise<boolean> {
  const { error } = await supabase.from('contato_mensagens').delete().eq('id', id);
  return !error;
}
