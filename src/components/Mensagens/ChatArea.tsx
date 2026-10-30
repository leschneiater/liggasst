import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageSquare, Send, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { fetchMessages, sendMessage, markMessageAsRead, getProfilePublic } from '../../services/database';

interface MessageRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

interface Conversation {
  counterpartId: string;
  name: string;
  messages: MessageRow[];
  unread: number;
  lastAt: string;
}

const LIMITE_CARACTERES = 5000;

const formataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

const ChatArea: React.FC<{ subtitulo: string }> = ({ subtitulo }) => {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const myId = currentUser?.id || '';
  const activeId = searchParams.get('para') || null;
  const bottomRef = useRef<HTMLDivElement>(null);

  const nomeDe = useCallback((id: string) => names[id] || 'Usuário', [names]);

  const load = useCallback(async (inicial = false) => {
    if (inicial) { setLoading(true); setError(false); }
    const result = await fetchMessages();
    if (!result.success || !Array.isArray(result.data)) {
      if (inicial) { setError(true); setLoading(false); }
      return;
    }
    const rows = result.data as MessageRow[];
    setMessages(rows);
    const ids = Array.from(new Set(rows.map(m => (m.sender_id === myId ? m.receiver_id : m.sender_id))));
    const faltantes = ids.filter(id => !names[id]);
    if (faltantes.length > 0) {
      const novos: Record<string, string> = {};
      await Promise.all(faltantes.map(async id => {
        const r = await getProfilePublic(id);
        novos[id] = (r.success && r.data?.display_name) || 'Usuário';
      }));
      setNames(prev => ({ ...prev, ...novos }));
    }
    if (inicial) setLoading(false);
  }, [myId, names]);

  useEffect(() => { load(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const t = setInterval(() => load(false), 15000);
    return () => clearInterval(t);
  }, [load]);

  const conversations = useMemo<Conversation[]>(() => {
    const grupos = new Map<string, MessageRow[]>();
    for (const m of messages) {
      const outro = m.sender_id === myId ? m.receiver_id : m.sender_id;
      if (!grupos.has(outro)) grupos.set(outro, []);
      grupos.get(outro)!.push(m);
    }
    const lista = Array.from(grupos.entries()).map(([counterpartId, msgs]) => {
      const ordenadas = [...msgs].sort((a, b) => a.created_at.localeCompare(b.created_at));
      return {
        counterpartId,
        name: nomeDe(counterpartId),
        messages: ordenadas,
        unread: msgs.filter(m => m.receiver_id === myId && !m.read).length,
        lastAt: ordenadas[ordenadas.length - 1].created_at
      };
    });
    return lista.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  }, [messages, myId, nomeDe]);

  const active = conversations.find(c => c.counterpartId === activeId) ||
    (activeId ? { counterpartId: activeId, name: nomeDe(activeId), messages: [], unread: 0, lastAt: '' } : null);

  // Resolver nome de uma contraparte nova (link ?para= sem mensagens ainda)
  useEffect(() => {
    if (activeId && !names[activeId]) {
      getProfilePublic(activeId).then(r => {
        setNames(prev => ({ ...prev, [activeId]: (r.success && r.data?.display_name) || 'Usuário' }));
      });
    }
  }, [activeId, names]);

  // Marcar como lidas ao abrir a conversa
  useEffect(() => {
    if (!active) return;
    const naoLidas = active.messages.filter(m => m.receiver_id === myId && !m.read);
    naoLidas.forEach(m => { markMessageAsRead(m.id); });
    if (naoLidas.length > 0) {
      setMessages(prev => prev.map(m => naoLidas.some(n => n.id === m.id) ? { ...m, read: true } : m));
    }
  }, [activeId, active?.messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [active?.messages.length]);

  const abrir = (id: string) => setSearchParams({ para: id });
  const voltar = () => setSearchParams({});

  const enviar = async () => {
    const texto = draft.trim();
    if (!texto || !activeId || sending) return;
    if (texto.length > LIMITE_CARACTERES) {
      toast.error(`Mensagem muito longa (máximo ${LIMITE_CARACTERES} caracteres).`);
      return;
    }
    setSending(true);
    const result = await sendMessage(myId, activeId, texto);
    setSending(false);
    if (result.success && result.data) {
      setMessages(prev => [...prev, result.data as MessageRow]);
      setDraft('');
    } else {
      toast.error('Não foi possível enviar. Tente novamente.');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
        <p className="font-roboto text-gray-600">Carregando conversas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
        <p className="font-roboto text-gray-600 mb-2">Não foi possível carregar suas mensagens.</p>
        <button onClick={() => load(true)} className="text-green-deep font-roboto font-medium hover:underline">
          Tentar novamente
        </button>
      </div>
    );
  }

  const listaConversas = (
    <div className={`${active ? 'hidden md:block' : ''} md:w-80 flex-shrink-0 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden`}>
      <div className="p-4 border-b border-gray-100">
        <h2 className="font-poppins font-semibold text-soft-black">Conversas</h2>
      </div>
      {conversations.length === 0 ? (
        <div className="p-8 text-center">
          <MessageSquare size={28} className="text-gray-300 mx-auto mb-3" />
          <p className="font-roboto text-sm text-gray-500">Nenhuma conversa ainda.</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 max-h-[28rem] overflow-y-auto">
          {conversations.map(c => (
            <li key={c.counterpartId}>
              <button
                onClick={() => abrir(c.counterpartId)}
                className={`w-full text-left p-4 hover:bg-neutral-gray transition-colors ${activeId === c.counterpartId ? 'bg-green-light/40' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-roboto font-medium text-soft-black truncate">{c.name}</span>
                  {c.unread > 0 && (
                    <span className="ml-2 bg-green-deep text-white text-xs font-roboto rounded-full px-2 py-0.5 flex-shrink-0">
                      {c.unread}
                    </span>
                  )}
                </div>
                <p className="font-roboto text-sm text-gray-500 truncate">
                  {c.messages[c.messages.length - 1]?.content}
                </p>
                <p className="font-roboto text-xs text-gray-400 mt-1">{formataHora(c.lastAt)}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const conversaAtiva = active && (
    <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col min-w-0">
      <div className="p-4 border-b border-gray-100 flex items-center space-x-3">
        <button onClick={voltar} className="md:hidden text-gray-500 hover:text-soft-black" aria-label="Voltar">
          <ArrowLeft size={20} />
        </button>
        <h2 className="font-poppins font-semibold text-soft-black truncate">{active.name}</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[24rem]">
        {active.messages.length === 0 && (
          <p className="font-roboto text-sm text-gray-500 text-center py-8">
            Comece a conversa escrevendo sua primeira mensagem abaixo.
          </p>
        )}
        {active.messages.map(m => (
          <div key={m.id} className={`flex ${m.sender_id === myId ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${m.sender_id === myId ? 'bg-green-deep text-white' : 'bg-neutral-gray text-soft-black'}`}>
              <p className="font-roboto text-sm whitespace-pre-wrap break-words">{m.content}</p>
              <p className={`font-roboto text-xs mt-1 ${m.sender_id === myId ? 'text-green-100' : 'text-gray-400'}`}>
                {formataHora(m.created_at)}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-end space-x-2">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
            placeholder="Escreva sua mensagem..."
            rows={2}
            maxLength={LIMITE_CARACTERES}
            className="flex-1 resize-none border border-gray-200 rounded-lg px-3 py-2 font-roboto text-sm focus:outline-none focus:ring-2 focus:ring-green-deep"
          />
          <button
            onClick={enviar}
            disabled={sending || !draft.trim()}
            className="bg-green-deep text-white rounded-lg px-4 py-2 hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center"
            aria-label="Enviar mensagem"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-poppins font-bold text-3xl text-soft-black mb-2">Mensagens</h1>
        <p className="font-roboto text-gray-600">{subtitulo}</p>
      </div>
      <div className="flex gap-6 items-start">
        {listaConversas}
        {conversaAtiva}
        {!active && (
          <div className="hidden md:flex flex-1 bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center items-center justify-center">
            <p className="font-roboto text-gray-500">Selecione uma conversa para visualizar.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatArea;
