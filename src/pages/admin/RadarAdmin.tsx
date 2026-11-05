// Gestao do Radar TST pela admin: criar, editar, salvar rascunho, publicar,
// despublicar e excluir artigos. Texto simples (paragrafos). Sem agendamento.
// Rascunho nunca aparece para assinantes (RLS exige status = publicado).
import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import AdminAreaNav from '../../components/Layout/AdminAreaNav';
import { RADAR_CAPA_IDEAL, dimensoesArte, erroProporcaoCapa } from '../../services/adsFormat';
import { prepararCapa, motivoFalhaCapa } from '../../services/capaImagem';
import RadarEditor from '../../components/RadarEditor';
import { sanitizarHtmlRadar, htmlParaTexto } from '../../services/radarHtml';
import { publicStorageUrl } from '../../services/publicUrl';

const radarCapaUrl = (p: string | null) => (p ? publicStorageUrl('radar-covers', p) : null);
import {
  adminListarRadar, adminCriarRadar, adminEditarRadar, adminDefinirStatusRadar, adminExcluirRadar,
  RadarAdminPost, StatusRadar, adminDefinirCapaRadar, uploadRadarCapa } from '../../services/radarAdmin';

const ROTULO: Record<StatusRadar, string> = { rascunho: 'Rascunho', publicado: 'Publicado' };
const VAZIO = { titulo: '', resumo: '', conteudo: '' };

const RadarAdmin: React.FC = () => {
  const [itens, setItens] = useState<RadarAdminPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [form, setForm] = useState(VAZIO);
  const [capa, setCapa] = useState<File | null>(null);
  const [erroCapa, setErroCapa] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    setLoading(true); setErro(null);
    const r = await adminListarRadar();
    if (!r.ok) setErro('Não foi possível carregar os artigos.'); else setItens(r.itens);
    setLoading(false);
  };
  useEffect(() => { carregar(); }, []);

  const valido = form.titulo.trim().length >= 3 && form.resumo.trim().length >= 3 && htmlParaTexto(form.conteudo).length >= 10;

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valido) { toast.error('Preencha título, headline e conteúdo.'); return; }
    setSalvando(true);
    const campos = { titulo: form.titulo.trim(), resumo: form.resumo.trim(), conteudo: sanitizarHtmlRadar(form.conteudo) };
    let artigoId: string | null = null;
    if (editando) {
      if (await adminEditarRadar(editando, campos)) artigoId = editando;
      else toast.error('Não foi possível salvar.');
    } else {
      const criado = await adminCriarRadar(campos);
      if (criado) artigoId = criado.id;
      else toast.error('Não foi possível salvar.');
    }
    if (artigoId && capa) {
      try {
        const arquivo = await prepararCapa(capa);
        const path = await uploadRadarCapa(arquivo);
        if (!(await adminDefinirCapaRadar(artigoId, path))) throw new Error('falha ao vincular a capa');
      } catch (err) {
        toast.error(`Artigo salvo, mas a capa não subiu (${motivoFalhaCapa(err)}). Tente editar e enviar de novo.`);
        setSalvando(false); return;
      }
    }
    if (artigoId) {
      toast.success(editando ? 'Artigo salvo.' : 'Rascunho salvo.');
      setEditando(null); setForm(VAZIO); setCapa(null); setErroCapa(null);
      await carregar();
    }
    setSalvando(false);
  };

  const editar = (p: RadarAdminPost) => { setEditando(p.id); setForm({ titulo: p.titulo, resumo: p.resumo, conteudo: p.conteudo }); setCapa(null); setErroCapa(null); window.scrollTo?.({ top: 0 }); };
  const cancelar = () => { setEditando(null); setForm(VAZIO); setCapa(null); setErroCapa(null); };

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
            <p className="text-xs text-gray-500 mt-1">{form.titulo.length}/200</p>
          </div>
          <div>
            <label htmlFor="radar-resumo" className="block text-sm font-medium text-gray-700 mb-1">Headline</label>
            <textarea id="radar-resumo" rows={2} className={campo} value={form.resumo} maxLength={500} onChange={(e) => setForm({ ...form, resumo: e.target.value })} />
            <p className="text-xs text-gray-500 mt-1">{form.resumo.length}/500 — frase curta em destaque logo abaixo do título.</p>
          </div>
          <div>
            <label htmlFor="radar-conteudo" className="block text-sm font-medium text-gray-700 mb-1">Conteúdo</label>
            <RadarEditor id="radar-conteudo" rotulo="Conteúdo" value={form.conteudo} onChange={(html) => setForm({ ...form, conteudo: html })} />
            <p className="text-xs text-gray-500 mt-1">Títulos em 3 níveis, negrito e itálico. Texto colado mantém a formatação permitida.</p>
          </div>
          <div>
            <label htmlFor="radar-capa" className="block text-sm font-medium text-gray-700 mb-1">Capa (opcional, JPG, PNG ou WebP, até {RADAR_CAPA_IDEAL.maxMB} MB)</label>
            {editando && (() => {
              const atual = itens.find((x) => x.id === editando);
              const url = atual ? radarCapaUrl(atual.capa_path) : null;
              return url ? (
                <div className="mb-2">
                  <img src={url} alt="Capa atual" className="w-64 aspect-[1200/630] object-cover rounded-lg" />
                  <button type="button" className="block text-xs text-red-600 mt-1 hover:underline"
                    onClick={async () => {
                      if (!editando) return;
                      if (await adminDefinirCapaRadar(editando, null)) { toast.success('Capa removida.'); await carregar(); }
                      else toast.error('Não foi possível remover a capa.');
                    }}>
                    Remover capa atual
                  </button>
                </div>
              ) : null;
            })()}
            <input id="radar-capa" type="file" accept="image/jpeg,image/png,image/webp" className={campo}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setErroCapa(null);
                if (!f) { setCapa(null); return; }
                dimensoesArte(f)
                  .then((d) => {
                    const erro = erroProporcaoCapa(d.largura, d.altura);
                    if (erro) { setCapa(null); setErroCapa(erro); e.target.value = ''; }
                    else setCapa(f);
                  })
                  .catch(() => { setCapa(null); setErroCapa('Não foi possível ler a imagem. Tente outro arquivo.'); e.target.value = ''; });
              }} />
            <p className="text-xs text-gray-500 mt-1">
              Tamanho fixo: proporção 1,9:1, ideal {RADAR_CAPA_IDEAL.largura} × {RADAR_CAPA_IDEAL.altura} px. A capa aparece
              no topo do artigo e no card da lista; imagens fora da proporção não são aceitas.
            </p>
            {erroCapa && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-2" role="alert">
                {erroCapa}
              </p>
            )}
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
