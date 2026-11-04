// Pre-checagens de limite do plano gratuito (migration 20261104020000).
// Sao so AVISO PREVIO: em caso de erro na leitura, falham abertas e o
// banco decide no insert/update (RLS e trigger tem a palavra final).
import { supabase } from '../lib/supabase';

// true quando o envio para este destinatario seria bloqueado pelo limite
// de 5 contatos novos/mes do plano gratuito (ja considera plano, papeis
// e conversa existente, no banco).
export async function limiteContatoNovoAtingido(receiverId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('limite_contato_novo_atingido', {
      p_receiver: receiverId,
    });
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
}

// Quantidade de demandas ativas (active/in_progress) da empresa logada;
// null quando nao foi possivel ler (cliente falha aberto).
export async function demandasAtivasMinhas(): Promise<number | null> {
  try {
    const { data, error } = await supabase.rpc('demandas_ativas_minhas');
    if (error || typeof data !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}
