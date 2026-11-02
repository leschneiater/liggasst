// Caixa de entrada do formulario de Contato: a admin le as mensagens, marca como
// respondida ou spam e exclui. A resposta e feita pelo e-mail informado pela pessoa.
import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import AdminAreaNav from '../../components/Layout/AdminAreaNav';
import {
  adminListarContatos, adminMarcarContato, adminExcluirContato, MensagemContato, StatusContato,
} from '../../services/contatos';

const ROTULO: Record<StatusContato, string> = { nova: 'Nova', respondida: 'Respondida', spam: 'Spam' };

const ContatosAdmin: React.FC = () => {
  const [itens, setItens] = useState<MensagemContato[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true); setErro(null);
    const r = await adminListarContatos();
    if (!r.ok) setErro('Não foi possível carregar as mensagens.'); else setItens(r.itens);
    setLoading(false);
  };
  useEffect(() => { carregar(); }, []);

  const marcar = async (id: string, status: StatusContato) => {
    if (await adminMarcarContato(id, status)) setItens((l) => l.map((m) => (m.id === id ? { ...m, status } : m)));
    else toast.error('Não foi possível atualizar.');
  };
  const excluir = async (id: string) => {
    if (!window.confirm('Excluir esta mensagem? Isso não pode ser desfeito.')) return;
    if (await adminExcluirContato(id)) setItens((l) => l.filter((m) => m.id !== id));
    else toast.error('Não foi possível excluir.');
  };

  return (
    <div className="min-h-screen bg-neutral-gray">
      <AdminAreaNav />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-poppins font-bold text-2xl text-soft-black">Mensagens de contato</h1>
          <Button variant="secondary" onClick={carregar} icon={RefreshCw}>Atualizar</Button>
        </div>
        {loading && <p className="font-roboto text-gray-600">Carregando...</p>}
        {erro && <p className="font-roboto text-red-600" role="alert">{erro}</p>}
        {!loading && !erro && itens.length === 0 && <p className="font-roboto text-gray-600">Nenhuma mensagem.</p>}
        <ul className="space-y-4">
          {itens.map((m) => (
            <li key={m.id} className="bg-white rounded-xl border border-gray-100 p-4" data-testid="contato-item">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-poppins font-semibold text-soft-black">{m.assunto}</p>
                <span className="font-roboto text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">{ROTULO[m.status]}</span>
              </div>
              <p className="font-roboto text-sm text-gray-600 mt-1">
                {m.nome} · <a className="text-green-deep underline" href={`mailto:${m.email}`}>{m.email}</a>
                {m.telefone ? ` · ${m.telefone}` : ''}{m.empresa ? ` · ${m.empresa}` : ''} · {new Date(m.created_at).toLocaleString('pt-BR')}
              </p>
              <p className="font-roboto text-gray-800 mt-3 whitespace-pre-wrap">{m.mensagem}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                {m.status !== 'respondida' && <Button size="sm" onClick={() => marcar(m.id, 'respondida')}>Marcar como respondida</Button>}
                {m.status !== 'spam' && <Button size="sm" variant="secondary" onClick={() => marcar(m.id, 'spam')}>Marcar como spam</Button>}
                <Button size="sm" variant="secondary" onClick={() => excluir(m.id)}>Excluir</Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ContatosAdmin;
