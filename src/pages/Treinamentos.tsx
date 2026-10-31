import React, { useEffect, useState } from 'react';
import { GraduationCap, FileText, ExternalLink, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { fetchTrainingsMembro, getTrainingPdfUrl, TrainingRow } from '../services/database';
import { treinamentoVisivelPara } from '../utils/treinamentos';
import { extrairYoutubeId, urlEmbedYoutube, urlAssistirYoutube } from '../utils/youtube';

const VideoYoutube: React.FC<{ youtubeUrl: string; titulo: string }> = ({ youtubeUrl, titulo }) => {
  const id = extrairYoutubeId(youtubeUrl);
  if (!id) return null;
  return (
    <div>
      <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
        <iframe
          title={titulo}
          src={urlEmbedYoutube(id)}
          className="absolute inset-0 w-full h-full rounded-lg"
          loading="lazy"
          // Sem autoplay. Sem referrerPolicy no-referrer: o YouTube exige o
          // Referer para o embed (erro 153 caso contrario).
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
      {/* Fallback: se o autor desativou a incorporacao, o player mostra erro;
          o link direto sempre abre no YouTube. Links externos podem ser
          repassados por quem tiver acesso. */}
      <a
        href={urlAssistirYoutube(id)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center space-x-1 text-sm text-green-deep hover:underline"
      >
        <ExternalLink className="w-4 h-4" aria-hidden="true" />
        <span>Abrir no YouTube</span>
      </a>
    </div>
  );
};

const Treinamentos: React.FC = () => {
  const { userType } = useAuth();
  const role = userType === 'company' ? 'company' : 'professional';
  const [treinamentos, setTreinamentos] = useState<TrainingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [abrindoPdf, setAbrindoPdf] = useState<string | null>(null);

  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      setErro(false);
      const r = await fetchTrainingsMembro();
      if (!r.success) {
        setErro(true);
      } else {
        // RLS ja filtra; o filtro local e defesa em profundidade.
        setTreinamentos(r.data.filter((t) => treinamentoVisivelPara(t, role)));
      }
      setLoading(false);
    };
    carregar();
  }, [role]);

  const abrirPdf = async (t: TrainingRow) => {
    setAbrindoPdf(t.id);
    const r = await getTrainingPdfUrl(t.id);
    setAbrindoPdf(null);
    if (r.success && r.signedUrl) {
      window.open(r.signedUrl, '_blank', 'noopener,noreferrer');
    } else {
      toast.error('Não foi possível abrir o PDF. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-gray py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-3 mb-6">
          <GraduationCap className="w-7 h-7 text-green-deep" aria-hidden="true" />
          <h1 className="font-poppins text-2xl font-bold text-gray-900">Treinamentos</h1>
        </div>

        {loading && <p className="font-roboto text-gray-600">Carregando...</p>}
        {erro && (
          <p className="font-roboto text-red-600">
            Não foi possível carregar os treinamentos. Tente novamente mais tarde.
          </p>
        )}
        {!loading && !erro && treinamentos.length === 0 && (
          <p className="font-roboto text-gray-600">
            Nenhum treinamento disponível no momento.
          </p>
        )}

        <div className="space-y-6">
          {treinamentos.map((t) => (
            <div key={t.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <h2 className="font-poppins text-lg font-semibold text-gray-900">{t.title}</h2>
              {t.description && (
                <p className="font-roboto text-gray-600 mt-1 whitespace-pre-line">{t.description}</p>
              )}
              {t.youtube_url && (
                <div className="mt-4">
                  <VideoYoutube youtubeUrl={t.youtube_url} titulo={t.title} />
                </div>
              )}
              {t.link_url && (
                <div className="mt-4">
                  <a
                    href={t.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 text-sm font-medium text-green-deep hover:underline"
                  >
                    <Link2 className="w-4 h-4" aria-hidden="true" />
                    <span>Acessar material externo</span>
                  </a>
                </div>
              )}
              {t.pdf_path && (
                <div className="mt-4">
                  <Button
                    variant="secondary"
                    onClick={() => abrirPdf(t)}
                    disabled={abrindoPdf === t.id}
                  >
                    <FileText className="w-4 h-4 mr-2" aria-hidden="true" />
                    {abrindoPdf === t.id ? 'Abrindo...' : 'Abrir material em PDF'}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Treinamentos;
