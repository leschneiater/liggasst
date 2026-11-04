import React, { useEffect, useState } from 'react';
import { GraduationCap, Plus, Trash2, FileText, Youtube, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import AdminAreaNav from '../../components/Layout/AdminAreaNav';
import {
  fetchTrainingsAdmin,
  createTraining,
  updateTraining,
  deleteTraining,
  uploadTrainingPdf,
  TrainingRow,
} from '../../services/database';
import { TrainingAudience } from '../../utils/treinamentos';
import { ROTULO_CONTENT_TYPE, SecaoContentType, TrilhaKind } from '../../utils/trilhas';
import {
  createSecao,
  createTrilha,
  deleteSecao,
  deleteTrilha,
  fetchSecoesAdmin,
  fetchTrilhasAdmin,
  SecaoTrilha,
  TrilhaAdmin,
  updateTrilha,
  uploadSecaoPdf,
} from '../../services/trilhas';
import { extrairYoutubeId } from '../../utils/youtube';
import BancoQuestoesAdmin from '../../components/admin/BancoQuestoesAdmin';
import { linkExternoValido } from '../../utils/linkExterno';

const ROTULOS_PUBLICO: Record<TrainingAudience, string> = {
  company: 'Empresas',
  professional: 'Profissionais',
  both: 'Empresas e profissionais',
};

const formInicial = {
  title: '',
  description: '',
  audience: 'both' as TrainingAudience,
  youtube_url: '',
  link_url: '',
};

const ROTULOS_KIND: Record<TrilhaKind, string> = {
  open: 'Trilha aberta (selo ao concluir)',
  certified: 'Trilha com certificado (próximas etapas)',
};

// CRUD de trilhas e secoes (Etapa 2). Substituem/englobam o "Novo
// treinamento" como forma de organizar conteudo em ordem; os treinamentos
// avulsos acima continuam funcionando.
const TrilhasAdminBlock: React.FC = () => {
  const [trilhas, setTrilhas] = useState<TrilhaAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    audience: 'both' as TrainingAudience,
    kind: 'open' as TrilhaKind,
  });
  const [salvando, setSalvando] = useState(false);
  const [expandida, setExpandida] = useState<string | null>(null);
  const [secoes, setSecoes] = useState<SecaoTrilha[]>([]);
  const [formSecao, setFormSecao] = useState({
    titulo: '',
    content_type: 'youtube' as SecaoContentType,
    url: '',
  });
  const [pdfSecao, setPdfSecao] = useState<File | null>(null);
  const [salvandoSecao, setSalvandoSecao] = useState(false);

  const carregar = async () => {
    setLoading(true);
    const r = await fetchTrilhasAdmin();
    if (r.success) setTrilhas(r.data);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const carregarSecoes = async (trailId: string) => {
    const r = await fetchSecoesAdmin(trailId);
    if (r.success) setSecoes(r.data);
  };

  const alternarExpandida = async (trailId: string) => {
    if (expandida === trailId) {
      setExpandida(null);
      setSecoes([]);
      return;
    }
    setExpandida(trailId);
    await carregarSecoes(trailId);
  };

  const salvarTrilha = async () => {
    const titulo = form.titulo.trim();
    if (titulo.length < 3) {
      toast.error('Informe um título com pelo menos 3 caracteres.');
      return;
    }
    setSalvando(true);
    const r = await createTrilha({
      titulo,
      descricao: form.descricao.trim(),
      audience: form.audience,
      kind: form.kind,
    });
    setSalvando(false);
    if (!r.success) {
      toast.error('Não foi possível salvar a trilha. Tente novamente.');
      return;
    }
    setForm({ titulo: '', descricao: '', audience: 'both', kind: 'open' });
    await carregar();
    toast.success('Trilha criada como rascunho.');
  };

  const alternarPublicacao = async (t: TrilhaAdmin) => {
    const r = await updateTrilha(t.id, { published: !t.published });
    if (r.success) {
      await carregar();
      toast.success(t.published ? 'Trilha voltou para rascunho.' : 'Trilha publicada.');
    } else {
      toast.error('Não foi possível atualizar. Tente novamente.');
    }
  };

  const excluirTrilha = async (t: TrilhaAdmin) => {
    const r = await deleteTrilha(t.id);
    if (r.success) {
      if (expandida === t.id) {
        setExpandida(null);
        setSecoes([]);
      }
      await carregar();
      toast.success('Trilha excluída.');
    } else {
      toast.error('Não foi possível excluir. Tente novamente.');
    }
  };

  const salvarSecao = async (trilha: TrilhaAdmin) => {
    const titulo = formSecao.titulo.trim();
    if (titulo.length < 3) {
      toast.error('Informe um título com pelo menos 3 caracteres.');
      return;
    }
    const tipo = formSecao.content_type;
    const url = formSecao.url.trim();
    if (tipo === 'pdf') {
      if (!pdfSecao) {
        toast.error('Escolha o arquivo PDF da seção.');
        return;
      }
    } else {
      if (tipo === 'youtube' && !extrairYoutubeId(url)) {
        toast.error('Link do YouTube inválido. Use o endereço completo do vídeo.');
        return;
      }
      if (tipo !== 'youtube' && !linkExternoValido(url)) {
        toast.error('Link inválido. Use um endereço http(s) completo.');
        return;
      }
    }
    setSalvandoSecao(true);
    // Para PDF, o id da secao ja nasce definido: conteudo guarda o path
    // <id>.pdf (mesmo bucket privado dos treinamentos), e o upload vem em
    // seguida. Enquanto o PDF nao sobe, a secao abre com erro de arquivo.
    const id = tipo === 'pdf' ? crypto.randomUUID() : undefined;
    const conteudo = tipo === 'pdf' ? `${id}.pdf` : url;
    const ordem = secoes.length > 0 ? Math.max(...secoes.map((x) => x.ordem)) + 1 : 1;
    const r = await createSecao({
      ...(id ? { id } : {}),
      trail_id: trilha.id,
      ordem,
      titulo,
      content_type: tipo,
      conteudo,
    });
    if (!r.success || !r.data) {
      setSalvandoSecao(false);
      toast.error('Não foi possível salvar a seção. Tente novamente.');
      return;
    }
    if (tipo === 'pdf' && pdfSecao) {
      const up = await uploadSecaoPdf(r.data.id, pdfSecao);
      if (!up.success) {
        setSalvandoSecao(false);
        toast.error('Seção criada, mas o PDF não subiu. Exclua e tente de novo.');
        await carregarSecoes(trilha.id);
        return;
      }
    }
    setSalvandoSecao(false);
    setFormSecao({ titulo: '', content_type: 'youtube', url: '' });
    setPdfSecao(null);
    await carregarSecoes(trilha.id);
    await carregar();
    toast.success('Seção adicionada.');
  };

  const excluirSecao = async (trilha: TrilhaAdmin, secao: SecaoTrilha) => {
    const r = await deleteSecao(secao.id);
    if (r.success) {
      await carregarSecoes(trilha.id);
      await carregar();
      toast.success('Seção excluída.');
    } else {
      toast.error('Não foi possível excluir. Tente novamente.');
    }
  };

  return (
    <div className="mt-10">
      <h2 className="font-poppins text-lg font-semibold text-gray-900 mb-4">Trilhas</h2>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-6">
        <h3 className="font-poppins font-semibold text-gray-900 mb-4">
          <Plus className="w-4 h-4 inline mr-1" aria-hidden="true" />
          Nova trilha
        </h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="trilha-titulo" className="block text-sm font-medium text-gray-700 mb-1">Título</label>
            <input
              id="trilha-titulo"
              type="text"
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              maxLength={200}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Ex.: Primeiros passos em SST"
            />
          </div>
          <div>
            <label htmlFor="trilha-descricao" className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea
              id="trilha-descricao"
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              maxLength={2000}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="trilha-publico" className="block text-sm font-medium text-gray-700 mb-1">Público</label>
              <select
                id="trilha-publico"
                value={form.audience}
                onChange={(e) => setForm({ ...form, audience: e.target.value as TrainingAudience })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {(Object.keys(ROTULOS_PUBLICO) as TrainingAudience[]).map((k) => (
                  <option key={k} value={k}>{ROTULOS_PUBLICO[k]}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="trilha-kind" className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                id="trilha-kind"
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value as TrilhaKind })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {(Object.keys(ROTULOS_KIND) as TrilhaKind[]).map((k) => (
                  <option key={k} value={k}>{ROTULOS_KIND[k]}</option>
                ))}
              </select>
            </div>
          </div>
          <Button onClick={salvarTrilha} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Criar trilha'}
          </Button>
        </div>
      </div>

      {loading && <p className="font-roboto text-gray-600">Carregando...</p>}
      {!loading && trilhas.length === 0 && (
        <p className="font-roboto text-gray-600">Nenhuma trilha cadastrada ainda.</p>
      )}

      <div className="space-y-4">
        {trilhas.map((t) => (
          <div key={t.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-poppins font-semibold text-gray-900">{t.titulo}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${t.published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {t.published ? 'Publicada' : 'Rascunho'}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-800">
                    {t.kind === 'open' ? 'Aberta' : 'Com certificado'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Público: {ROTULOS_PUBLICO[t.audience]} · {t.totalSecoes} {t.totalSecoes === 1 ? 'seção' : 'seções'}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => alternarExpandida(t.id)}>
                  {expandida === t.id ? 'Fechar seções' : 'Seções'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => alternarPublicacao(t)}>
                  {t.published ? 'Despublicar' : 'Publicar'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => excluirTrilha(t)} aria-label={`Excluir trilha ${t.titulo}`}>
                  <Trash2 className="w-4 h-4 text-red-600" aria-hidden="true" />
                </Button>
              </div>
            </div>

            {expandida === t.id && (
              <div className="mt-4 border-t border-gray-200 pt-4">
                {secoes.length === 0 && (
                  <p className="font-roboto text-sm text-gray-600 mb-3">Nenhuma seção ainda.</p>
                )}
                <div className="space-y-2 mb-4">
                  {secoes.map((sec, i) => (
                    <div key={sec.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-sm text-gray-800">
                        {i + 1}. {sec.titulo} <span className="text-gray-500">({ROTULO_CONTENT_TYPE[sec.content_type]})</span>
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => excluirSecao(t, sec)} aria-label={`Excluir seção ${sec.titulo}`}>
                        <Trash2 className="w-4 h-4 text-red-600" aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="bg-gray-50 rounded-lg p-3 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="secao-titulo" className="block text-sm font-medium text-gray-700 mb-1">Título da seção</label>
                      <input
                        id="secao-titulo"
                        type="text"
                        value={formSecao.titulo}
                        onChange={(e) => setFormSecao({ ...formSecao, titulo: e.target.value })}
                        maxLength={200}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="secao-tipo" className="block text-sm font-medium text-gray-700 mb-1">Tipo de conteúdo</label>
                      <select
                        id="secao-tipo"
                        value={formSecao.content_type}
                        onChange={(e) => setFormSecao({ ...formSecao, content_type: e.target.value as SecaoContentType })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="youtube">Vídeo do YouTube</option>
                        <option value="link">Link externo</option>
                        <option value="pdf">PDF</option>
                      </select>
                    </div>
                  </div>
                  {formSecao.content_type === 'pdf' ? (
                    <div>
                      <label htmlFor="secao-pdf" className="block text-sm font-medium text-gray-700 mb-1">PDF (até 10 MB)</label>
                      <input
                        id="secao-pdf"
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => setPdfSecao(e.target.files?.[0] ?? null)}
                        className="w-full text-sm"
                      />
                    </div>
                  ) : (
                    <div>
                      <label htmlFor="secao-url" className="block text-sm font-medium text-gray-700 mb-1">
                        {formSecao.content_type === 'youtube' ? 'Endereço do vídeo' : 'Endereço do material'}
                      </label>
                      <input
                        id="secao-url"
                        type="url"
                        value={formSecao.url}
                        onChange={(e) => setFormSecao({ ...formSecao, url: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="https://..."
                      />
                    </div>
                  )}
                  <Button variant="secondary" size="sm" onClick={() => salvarSecao(t)} disabled={salvandoSecao}>
                    {salvandoSecao ? 'Salvando...' : 'Adicionar seção'}
                  </Button>
                </div>

                {t.kind === 'certified' && (
                  <BancoQuestoesAdmin trilha={t} secoes={secoes} />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const TreinamentosAdmin: React.FC = () => {
  const [treinamentos, setTreinamentos] = useState<TrainingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [form, setForm] = useState(formInicial);
  const [pdf, setPdf] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    setLoading(true);
    setErro(false);
    const r = await fetchTrainingsAdmin();
    if (!r.success) setErro(true);
    else setTreinamentos(r.data);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const salvar = async () => {
    const titulo = form.title.trim();
    if (titulo.length < 3) {
      toast.error('Informe um título com pelo menos 3 caracteres.');
      return;
    }
    const url = form.youtube_url.trim();
    if (url && !extrairYoutubeId(url)) {
      toast.error('Link do YouTube inválido. Use o endereço completo do vídeo.');
      return;
    }
    const link = form.link_url.trim();
    if (link && !linkExternoValido(link)) {
      toast.error('Link externo inválido. Use um endereço http(s) completo.');
      return;
    }
    if (!url && !pdf && !link) {
      toast.error('Adicione um vídeo do YouTube, um PDF, um link externo ou uma combinação deles.');
      return;
    }
    setSalvando(true);
    const criado = await createTraining({
      title: titulo,
      description: form.description.trim(),
      audience: form.audience,
      youtube_url: url || null,
      link_url: link || null,
      status: 'draft',
    });
    if (!criado.success || !criado.data) {
      setSalvando(false);
      toast.error('Não foi possível salvar. Tente novamente.');
      return;
    }
    let novo = criado.data;
    if (pdf) {
      const up = await uploadTrainingPdf(novo.id, pdf);
      if (!up.success || !up.path) {
        setSalvando(false);
        toast.error('Treinamento criado, mas o PDF não subiu. Edite para tentar de novo.');
        setTreinamentos((prev) => [novo, ...prev]);
        setForm(formInicial);
        setPdf(null);
        return;
      }
      const atualizado = await updateTraining(novo.id, { pdf_path: up.path });
      if (atualizado.success && atualizado.data) novo = atualizado.data;
    }
    setSalvando(false);
    setTreinamentos((prev) => [novo, ...prev]);
    setForm(formInicial);
    setPdf(null);
    toast.success('Treinamento salvo como rascunho.');
  };

  const alternarPublicacao = async (t: TrainingRow) => {
    const novoStatus = t.status === 'published' ? 'draft' : 'published';
    const r = await updateTraining(t.id, { status: novoStatus });
    if (r.success && r.data) {
      setTreinamentos((prev) => prev.map((x) => (x.id === t.id ? r.data! : x)));
      toast.success(novoStatus === 'published' ? 'Treinamento publicado.' : 'Treinamento voltou para rascunho.');
    } else {
      toast.error('Não foi possível atualizar. Tente novamente.');
    }
  };

  const excluir = async (t: TrainingRow) => {
    const r = await deleteTraining(t.id, t.pdf_path);
    if (r.success) {
      setTreinamentos((prev) => prev.filter((x) => x.id !== t.id));
      toast.success('Treinamento excluído.');
    } else {
      toast.error('Não foi possível excluir. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-gray">
      <AdminAreaNav />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center space-x-3 mb-6">
          <GraduationCap className="w-7 h-7 text-green-deep" aria-hidden="true" />
          <h1 className="font-poppins text-2xl font-bold text-gray-900">Capacitação</h1>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-8">
          <h2 className="font-poppins text-lg font-semibold text-gray-900 mb-4">
            <Plus className="w-4 h-4 inline mr-1" aria-hidden="true" />
            Novo treinamento
          </h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="titulo" className="block text-sm font-medium text-gray-700 mb-1">Título</label>
              <input
                id="titulo"
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                maxLength={200}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Ex.: NR-35 - Trabalho em altura"
              />
            </div>
            <div>
              <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <textarea
                id="descricao"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                maxLength={2000}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="publico" className="block text-sm font-medium text-gray-700 mb-1">Público</label>
              <select
                id="publico"
                value={form.audience}
                onChange={(e) => setForm({ ...form, audience: e.target.value as TrainingAudience })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {(Object.keys(ROTULOS_PUBLICO) as TrainingAudience[]).map((k) => (
                  <option key={k} value={k}>{ROTULOS_PUBLICO[k]}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="youtube" className="block text-sm font-medium text-gray-700 mb-1">
                Vídeo do YouTube (opcional)
              </label>
              <input
                id="youtube"
                type="url"
                value={form.youtube_url}
                onChange={(e) => setForm({ ...form, youtube_url: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="https://www.youtube.com/watch?v=..."
              />
              <p className="text-xs text-gray-500 mt-1">
                O vídeo precisa permitir incorporação no YouTube. Quem tiver acesso pode repassar o link.
              </p>
            </div>
            <div>
              <label htmlFor="link" className="block text-sm font-medium text-gray-700 mb-1">
                Link externo (opcional)
              </label>
              <input
                id="link"
                type="url"
                value={form.link_url}
                onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="https://exemplo.com/material"
              />
              <p className="text-xs text-gray-500 mt-1">
                Abre em nova aba. Apenas http/https; quem tiver acesso pode repassar o link.
              </p>
            </div>
            <div>
              <label htmlFor="pdf" className="block text-sm font-medium text-gray-700 mb-1">
                PDF (opcional, até 10 MB)
              </label>
              <input
                id="pdf"
                type="file"
                accept="application/pdf"
                onChange={(e) => setPdf(e.target.files?.[0] ?? null)}
                className="w-full text-sm"
              />
            </div>
            <Button onClick={salvar} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar rascunho'}
            </Button>
          </div>
        </div>

        {loading && <p className="font-roboto text-gray-600">Carregando...</p>}
        {erro && <p className="font-roboto text-red-600">Não foi possível carregar. Tente novamente.</p>}
        {!loading && !erro && treinamentos.length === 0 && (
          <p className="font-roboto text-gray-600">Nenhuma capacitação cadastrada ainda.</p>
        )}

        <div className="space-y-4">
          {treinamentos.map((t) => (
            <div key={t.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-poppins font-semibold text-gray-900">{t.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${t.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {t.status === 'published' ? 'Publicado' : 'Rascunho'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">Público: {ROTULOS_PUBLICO[t.audience]}</p>
                <div className="flex items-center space-x-3 mt-1 text-sm text-gray-500">
                  {t.youtube_url && (
                    <span className="inline-flex items-center space-x-1">
                      <Youtube className="w-4 h-4" aria-hidden="true" /><span>Vídeo</span>
                    </span>
                  )}
                  {t.pdf_path && (
                    <span className="inline-flex items-center space-x-1">
                      <FileText className="w-4 h-4" aria-hidden="true" /><span>PDF</span>
                    </span>
                  )}
                  {t.link_url && (
                    <span className="inline-flex items-center space-x-1">
                      <Link2 className="w-4 h-4" aria-hidden="true" /><span>Link</span>
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => alternarPublicacao(t)}>
                  {t.status === 'published' ? 'Despublicar' : 'Publicar'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => excluir(t)} aria-label={`Excluir ${t.title}`}>
                  <Trash2 className="w-4 h-4 text-red-600" aria-hidden="true" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <TrilhasAdminBlock />
      </div>
    </div>
  );
};

export default TreinamentosAdmin;
