// Radar TST: blog exclusivo para assinantes pagos dos dois publicos
// (profissional e empresa). Dupla camada, fail-closed:
//   1) gate de cliente (fetchAssinatura + assinaturaPagaAtiva) bloqueia a
//      tela sem assinatura paga ativa — nao e so esconder o link do menu;
//   2) os artigos NAO estao no bundle: vem de public.radar_posts, cuja RLS
//      aplica a MESMA regra no banco (sem plano pago, zero linhas).
// Conteudo editorial ainda nao definido: sem artigos inventados; a lista
// vazia mostra estado vazio honesto ate a fonte de conteudo ser decidida.
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Radar, Lock, AlertTriangle, Search, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchAssinatura } from '../services/assinatura';
import { assinaturaPagaAtiva } from '../utils/assinaturaAcesso';
import { fetchRadarPosts, fetchRadarPost, type RadarTstPost, type RadarTstResumo, radarCapaUrl } from '../services/radarTst';
import { conteudoParaHtml } from '../services/radarHtml';
import Button from '../components/ui/Button';

const RadarTst: React.FC = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [pago, setPago] = useState(false);
  const [posts, setPosts] = useState<RadarTstResumo[] | null>(null);
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState<RadarTstPost | null>(null);
  const [abrindo, setAbrindo] = useState(false);

  const normaliza = (t: string) =>
    t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const abrirArtigo = async (id: string) => {
    setAbrindo(true);
    try {
      const post = await fetchRadarPost(id);
      if (post) setAberto(post);
      else setErro(true);
    } catch {
      setErro(true);
    } finally {
      setAbrindo(false);
    }
  };

  const postsFiltrados = useMemo(() => {
    const lista = posts ?? [];
    const q = normaliza(busca.trim());
    if (!q) return lista;
    return lista.filter(
      (post) => normaliza(post.titulo).includes(q) || normaliza(post.resumo).includes(q),
    );
  }, [busca, posts]);

  useEffect(() => {
    if (!currentUser) return;
    let vivo = true;
    (async () => {
      try {
        const a = await fetchAssinatura(currentUser.id);
        const liberado = assinaturaPagaAtiva(a);
        if (!liberado) {
          if (vivo) setPago(false);
          return;
        }
        const lista = await fetchRadarPosts();
        if (vivo) {
          setPosts(lista);
          setPago(true);
        }
      } catch {
        if (vivo) setErro(true);
      } finally {
        if (vivo) setLoading(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [currentUser]);

  return (
    <div className="min-h-screen bg-neutral-gray py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-3 mb-6">
          <Radar className="w-7 h-7 text-green-deep" aria-hidden="true" />
          <h1 className="font-poppins text-2xl font-bold text-gray-900">Radar TST</h1>
        </div>

        {loading && <p className="font-roboto text-gray-600">Carregando...</p>}

        {erro && !loading && (
          <div className="flex items-center space-x-2 text-red-600 font-roboto">
            <AlertTriangle size={18} aria-hidden="true" />
            <p>Não foi possível verificar seu plano. Tente novamente mais tarde.</p>
          </div>
        )}

        {!loading && !erro && !pago && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <Lock className="w-10 h-10 text-green-deep mx-auto mb-4" aria-hidden="true" />
            <h2 className="font-poppins font-semibold text-lg text-soft-black mb-2">
              Conteúdo exclusivo para assinantes
            </h2>
            <p className="font-roboto text-gray-600 mb-6">
              O Radar TST é o blog do Ligga com conteúdo para quem assina o plano pago,
              profissional ou empresa.
            </p>
            <Button as={Link} to="/planos">Ver planos</Button>
          </div>
        )}

        {!loading && !erro && pago && aberto && (
          <article className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <button
              type="button"
              onClick={() => setAberto(null)}
              className="flex items-center space-x-1 text-green-deep font-roboto mb-4 hover:underline"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              <span>Voltar para a lista</span>
            </button>
            {radarCapaUrl(aberto.capa_path) && (
              <img
                src={radarCapaUrl(aberto.capa_path) as string}
                alt={`Capa: ${aberto.titulo}`}
                className="w-full aspect-[1200/630] object-cover rounded-lg mb-4"
              />
            )}
            <h2 className="font-poppins font-bold text-xl text-soft-black mb-1">{aberto.titulo}</h2>
            <p className="font-roboto text-sm text-gray-500 mb-4">
              {new Date(aberto.publicado_em).toLocaleDateString('pt-BR')}
            </p>
            <div className="font-roboto text-gray-700 radar-conteudo" dangerouslySetInnerHTML={{ __html: conteudoParaHtml(aberto.conteudo) }} />
          </article>
        )}

        {abrindo && <p className="font-roboto text-gray-600 mb-2">Abrindo artigo...</p>}

        {!loading && !erro && pago && !aberto && posts !== null && (
          <>
            {posts.length > 0 && (
              <div className="relative mb-4">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Pesquisar artigos do Radar TST"
                  aria-label="Pesquisar artigos do Radar TST"
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 font-roboto focus:outline-none focus:ring-2 focus:ring-green-deep"
                />
              </div>
            )}
            {posts.length === 0 && (
              <p className="font-roboto text-gray-600">
                Nenhum artigo publicado ainda. Volte em breve.
              </p>
            )}
            {posts.length > 0 && postsFiltrados.length === 0 && (
              <p className="font-roboto text-gray-600">
                Nenhum artigo encontrado para essa pesquisa.
              </p>
            )}
            <div className="space-y-4">
              {postsFiltrados.map((post) => (
                <article
                  key={post.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => abrirArtigo(post.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') abrirArtigo(post.id); }}
                >
                  {radarCapaUrl(post.capa_path) && (
                    <img
                      src={radarCapaUrl(post.capa_path) as string}
                      alt=""
                      className="w-full aspect-[1200/630] object-cover rounded-lg mb-3"
                    />
                  )}
                  <h2 className="font-poppins font-semibold text-lg text-soft-black">{post.titulo}</h2>
                  <p className="font-roboto text-sm text-gray-500 mb-2">
                    {new Date(post.publicado_em).toLocaleDateString('pt-BR')}
                  </p>
                  <p className="font-roboto text-gray-700">{post.resumo}</p>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RadarTst;
