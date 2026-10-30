import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Gate de liberacao da area de mensagens (fase de validacao antes da
// abertura geral): enquanto a flag nao e aberta, so contas da lista de
// validacao veem as entradas de mensagens. No build de fixture (inspecao
// visual local), a query string controla: ?fixture=... liga por padrao;
// &msg=0 forca oculto e &msg=1 forca visivel.
export function useMessagingDisponivel(): { disponivel: boolean; carregando: boolean } {
  const params = new URLSearchParams(window.location.search);
  const forcado = params.get('msg');
  const fixture = params.has('fixture');
  const inicial = forcado === '1' || (fixture && forcado !== '0');
  const [estado, setEstado] = useState({ disponivel: inicial, carregando: !inicial });

  useEffect(() => {
    if (forcado === '1') { setEstado({ disponivel: true, carregando: false }); return; }
    if (forcado === '0') { setEstado({ disponivel: false, carregando: false }); return; }
    if (fixture) { setEstado({ disponivel: true, carregando: false }); return; }
    let ativo = true;
    supabase.rpc('messaging_disponivel').then(({ data, error }) => {
      if (ativo) setEstado({ disponivel: !error && data === true, carregando: false });
    });
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return estado;
}
