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
import { extrairYoutubeId } from '../../utils/youtube';
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
          <h1 className="font-poppins text-2xl font-bold text-gray-900">Treinamentos</h1>
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
          <p className="font-roboto text-gray-600">Nenhum treinamento cadastrado ainda.</p>
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
      </div>
    </div>
  );
};

export default TreinamentosAdmin;
