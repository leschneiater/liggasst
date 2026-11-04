// Gestao do carrossel de anuncios do plano gratuito (decisao dela 04/11):
// upload da arte, link opcional, ordem, ativar/desativar, tempo por arte e
// maximo de artes ativas (padroes 5s/5, editaveis) e contagem de cliques.
// Banners so aparecem para contas free logadas (gate na RLS); a pagina de
// gestao e exclusiva de admin (RLS + ProtectedRoute).
import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import AdminAreaNav from '../../components/Layout/AdminAreaNav';
import {
  AdBanner, adImagemUrl, atualizarBanner, criarBanner, excluirBanner,
  fetchAdsConfig, fetchTodosBanners, salvarAdsConfig, uploadArteAd,
} from '../../services/ads';

const VAZIO = { titulo: '', link: '', ordem: 0, ativo: true };

const AdsAdmin: React.FC = () => {
  const [itens, setItens] = useState<AdBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [form, setForm] = useState(VAZIO);
  const [arte, setArte] = useState<File | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [cfg, setCfg] = useState({ intervalo_segundos: 5, max_ativos: 5 });

  const carregar = async () => {
    setLoading(true); setErro(null);
    try {
      const [lista, config] = await Promise.all([fetchTodosBanners(), fetchAdsConfig()]);
      setItens(lista); setCfg(config);
    } catch { setErro('Não foi possível carregar os anúncios.'); }
    setLoading(false);
  };
  useEffect(() => { carregar(); }, []);

  const valido = form.titulo.trim().length >= 3 && (editando !== null || arte !== null);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valido) { toast.error('Preencha o título e escolha a arte.'); return; }
    setSalvando(true);
    try {
      const campos = {
        titulo: form.titulo.trim(),
        link: form.link.trim() || null,
        ordem: Number(form.ordem) || 0,
        ativo: form.ativo,
      };
      if (editando) {
        await atualizarBanner(editando, campos);
        toast.success('Anúncio salvo.');
        setEditando(null); setForm(VAZIO); setArte(null);
      } else {
        const imagem_path = await uploadArteAd(arte as File);
        await criarBanner({ ...campos, imagem_path });
        toast.success('Anúncio criado.');
        setForm(VAZIO); setArte(null);
      }
      await carregar();
    } catch { toast.error('Não foi possível salvar.'); }
    setSalvando(false);
  };

  const salvarConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await salvarAdsConfig(cfg);
      toast.success('Configuração salva.');
    } catch { toast.error('Não foi possível salvar a configuração.'); }
  };

  const editar = (b: AdBanner) => {
    setEditando(b.id);
    setForm({ titulo: b.titulo, link: b.link ?? '', ordem: b.ordem, ativo: b.ativo });
    window.scrollTo?.({ top: 0 });
  };
  const alternar = async (b: AdBanner) => {
    try { await atualizarBanner(b.id, { ativo: !b.ativo }); await carregar(); }
    catch { toast.error('Não foi possível atualizar.'); }
  };
  const excluir = async (b: AdBanner) => {
    if (!window.confirm(`Excluir o anúncio "${b.titulo}"? Isso não pode ser desfeito.`)) return;
    try { await excluirBanner(b.id); setItens((l) => l.filter((x) => x.id !== b.id)); }
    catch { toast.error('Não foi possível excluir.'); }
  };

  const campo = 'w-full rounded-lg border border-gray-300 px-3 py-2 font-roboto text-sm';
  return (
    <div className="min-h-screen bg-neutral-gray">
      <AdminAreaNav />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-poppins font-bold text-2xl text-soft-black">Publicidade</h1>
          <Button variant="secondary" onClick={carregar} icon={RefreshCw}>Atualizar</Button>
        </div>

        <form onSubmit={salvarConfig} className="bg-white rounded-xl border border-gray-100 p-4 mb-8">
          <h2 className="font-poppins font-semibold text-lg text-soft-black mb-3">Exibição</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ads-intervalo" className="block text-sm font-medium text-gray-700 mb-1">Tempo por arte (segundos)</label>
              <input id="ads-intervalo" type="number" min={2} max={120} className={campo}
                value={cfg.intervalo_segundos}
                onChange={(e) => setCfg({ ...cfg, intervalo_segundos: Number(e.target.value) })} />
            </div>
            <div>
              <label htmlFor="ads-max" className="block text-sm font-medium text-gray-700 mb-1">Máximo de artes ativas</label>
              <input id="ads-max" type="number" min={1} max={20} className={campo}
                value={cfg.max_ativos}
                onChange={(e) => setCfg({ ...cfg, max_ativos: Number(e.target.value) })} />
            </div>
          </div>
          <div className="mt-3"><Button type="submit">Salvar configuração</Button></div>
          <p className="text-xs text-gray-500 mt-2">Os anúncios aparecem somente para contas no plano gratuito, dentro das áreas logadas.</p>
        </form>

        <form onSubmit={salvar} className="bg-white rounded-xl border border-gray-100 p-4 mb-8 space-y-3">
          <h2 className="font-poppins font-semibold text-lg text-soft-black">{editando ? 'Editar anúncio' : 'Novo anúncio'}</h2>
          <div>
            <label htmlFor="ads-titulo" className="block text-sm font-medium text-gray-700 mb-1">Título</label>
            <input id="ads-titulo" className={campo} value={form.titulo} maxLength={120}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          </div>
          {!editando && (
            <div>
              <label htmlFor="ads-arte" className="block text-sm font-medium text-gray-700 mb-1">Arte (JPG, PNG ou WebP, até 2 MB)</label>
              <input id="ads-arte" type="file" accept="image/jpeg,image/png,image/webp" className={campo}
                onChange={(e) => setArte(e.target.files?.[0] ?? null)} />
            </div>
          )}
          <div>
            <label htmlFor="ads-link" className="block text-sm font-medium text-gray-700 mb-1">Link de destino (opcional)</label>
            <input id="ads-link" type="url" className={campo} value={form.link} placeholder="https://..."
              onChange={(e) => setForm({ ...form, link: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4 items-end">
            <div>
              <label htmlFor="ads-ordem" className="block text-sm font-medium text-gray-700 mb-1">Ordem</label>
              <input id="ads-ordem" type="number" className={campo} value={form.ordem}
                onChange={(e) => setForm({ ...form, ordem: Number(e.target.value) })} />
            </div>
            <label className="flex items-center gap-2 pb-2">
              <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
              <span className="font-roboto text-sm text-gray-700">Ativo</span>
            </label>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={salvando}>{editando ? 'Salvar alterações' : 'Criar anúncio'}</Button>
            {editando && <Button type="button" variant="secondary" onClick={() => { setEditando(null); setForm(VAZIO); }}>Cancelar</Button>}
          </div>
        </form>

        {loading && <p className="font-roboto text-gray-600">Carregando...</p>}
        {erro && <p className="font-roboto text-red-600" role="alert">{erro}</p>}
        {!loading && !erro && itens.length === 0 && <p className="font-roboto text-gray-600">Nenhum anúncio cadastrado.</p>}
        <ul className="space-y-4">
          {itens.map((b) => (
            <li key={b.id} className="bg-white rounded-xl border border-gray-100 p-4" data-testid="ads-item">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-poppins font-semibold text-soft-black">{b.titulo}</p>
                <div className="flex items-center gap-2">
                  <span className="font-roboto text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">{b.cliques} cliques</span>
                  <span className={`font-roboto text-xs px-2 py-1 rounded-full ${b.ativo ? 'bg-green-light text-green-deep' : 'bg-gray-100 text-gray-700'}`}>
                    {b.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
              <img src={adImagemUrl(b.imagem_path)} alt={b.titulo} className="mt-2 h-20 rounded-lg object-cover" />
              <p className="font-roboto text-sm text-gray-600 mt-1">
                Ordem {b.ordem}{b.link ? ` · ${b.link}` : ' · sem link'}
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                <Button size="sm" variant="secondary" onClick={() => editar(b)}>Editar</Button>
                <Button size="sm" onClick={() => alternar(b)}>{b.ativo ? 'Desativar' : 'Ativar'}</Button>
                <Button size="sm" variant="secondary" onClick={() => excluir(b)}>Excluir</Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AdsAdmin;
