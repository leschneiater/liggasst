// Gestao do Radar TST pela admin: criar, editar, salvar rascunho, publicar,
// despublicar e excluir artigos. Texto simples (paragrafos). Sem agendamento.
// Rascunho nunca aparece para assinantes (RLS exige status = publicado).
import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import AdminAreaNav from '../../components/Layout/AdminAreaNav';
import {
  adminListarRadar, adminCriarRadar, adminEditarRadar, adminDefinirStatusRadar, adminExcluirRadar,
  RadarAdminPost, StatusRadar,
} from '../../services/radarAdmin';

const ROTULO: Record<StatusRadar, string> = { rascunho: 'Rascunho', publicado: 'Publicado' };
const VAZIO = { titulo: '', resumo: '', conteudo: '' };

const RadarAdmin: React.FC = () => {
  const [itens, setItens] = useState<RadarAdminPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [form, setForm] = useState(VAZIO);
  const [editando, setEditando] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    setLoading(true); setErro(null);
    const r = await adminListarRadar();
    if (!r.ok) setErro('Não foi possível carregar os artigos.'); else setItens(r.itens);
    setLoading(false);
  };
  useEffect(() => { carregar(); }, []);

  const valido = form.titulo.trim().length >= 3 && form.resumo.trim().length >= 3 && form.conteudo.trim().length >= 10;

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valido) { toast.error('Preencha título, resumo e conteúdo.'); return; }
    setSalvando(true);
    const campos = { titulo: form.titulo.trim(), resumo: form.resumo.trim(), conteudo: form.conteudo.trim() };
    if (editando) {
      if (await adminEditarRadar(editando, campos)) { toast.success('Artigo salvo.'); setEditando(null); setForm(VAZIO); await carregar(); }
      else toast.error('Não foi possível salvar.');
    } else if (await adminCriarRadar(campos)) {
      toast.success('Rascunho salvo.'); setForm(VAZIO); await carregar();
    } else toast.error('Não foi possível salvar.');
    setSalvando(false);
  };

  const editar = (p: RadarAdminPost) => { setEditando(p.id); setForm({ titulo: p.titulo, resumo: p.resumo, conteudo: p.conteudo }); window.scrollTo?.({ top: 0 }); };
  const cancelar = () => { setEditando(null); setForm(VAZIO); };

  const alternar = async (p: RadarAdminPost) => {
    const novo: StatusRadar = p.status === 'publicado' ? 'rascunho' : 'publicado';
    if (await adminDefinirStatusRadar(p.id, novo)) {
      toast.success(novo === 'publicado' ? 'Artigo publicado para assinantes.' : 'Artigo voltou para rascunho.');
      await carregar();
    } else toast.error('Não foi possível atualizar.');
  };
  const excluir = async (p: RadarAdminPost) => {
    if (!window.confirm('Excluir este artigo? Isso não pode ser desfeito.')) return;
    if (await adminExcluirRadar(p.id)) setItens((l) => l.filter((x) => x.id !== p.id));
    else toast.error('Não foi possível excluir.');
  };

  const campo = 'w-full rounded-lg border border-gray-300 px-3 py-2 font-roboto text-sm';
  return (
    <div className="min-h-screen bg-neutral-gray">
      <AdminAreaNav />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-poppins font-bold text-2xl text-soft-black">Radar TST</h1>
          <Button variant="secondary" onClick={carregar} icon={RefreshCw}>Atualizar</Button>
        </div>

        <form onSubmit={salvar} className="bg-white rounded-xl border border-gray-100 p-4 mb-8 space-y-3">
          <h2 className="font-poppins font-semibold text-lg text-soft-black">{editando ? 'Editar artigo' : 'Novo artigo'}</h2>
          <div>
            <label htmlFor="radar-titulo" className="block text-sm font-medium text-gray-700 mb-1">Título</label>
            <input id="radar-titulo" className={campo} value={form.titulo} maxLength={200} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          </div>
          <div>
            <label htmlFor="radar-resumo" className="block text-sm font-medium text-gray-700 mb-1">Resumo</label>
            <textarea id="radar-resumo" rows={2} className={campo} value={form.resumo} maxLength={500} onChange={(e) => setForm({ ...form, resumo: e.target.value })} />
          </div>
          <div>
            <label htmlFor="radar-conteudo" className="block text-sm font-medium text-gray-700 mb-1">Conteúdo</label>
            <textarea id="radar-conteudo" rows={10} className={campo} value={form.conteudo} onChange={(e) => setForm({ ...form, conteudo: e.target.value })} />
            <p className="text-xs text-gray-500 mt-1">Texto simples. Use linha em branco para separar parágrafos.</p>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={salvando}>{editando ? 'Salvar alterações' : 'Salvar rascunho'}</Button>
            {editando && <Button type="button" variant="secondary" onClick={cancelar}>Cancelar</Button>}
          </div>
          <p className="text-xs text-gray-500">Novos artigos ficam como rascunho. Só aparecem para assinantes depois de publicar.</p>
        </form>

        {loading && <p className="font-roboto text-gray-600">Carregando...</p>}
        {erro && <p className="font-roboto text-red-600" role="alert">{erro}</p>}
        {!loading && !erro && itens.length === 0 && <p className="font-roboto text-gray-600">Nenhum artigo cadastrado.</p>}
        <ul className="space-y-4">
          {itens.map((p) => (
            <li key={p.id} className="bg-white rounded-xl border border-gray-100 p-4" data-testid="radar-item">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-poppins font-semibold text-soft-black">{p.titulo}</p>
                <span className="font-roboto text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">{ROTULO[p.status]}</span>
              </div>
              <p className="font-roboto text-sm text-gray-600 mt-1">{p.resumo}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                <Button size="sm" variant="secondary" onClick={() => editar(p)}>Editar</Button>
                <Button size="sm" onClick={() => alternar(p)}>{p.status === 'publicado' ? 'Voltar para rascunho' : 'Publicar'}</Button>
                <Button size="sm" variant="secondary" onClick={() => excluir(p)}>Excluir</Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default RadarAdmin;
