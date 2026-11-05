import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, FileText, Link2, Lock, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { fetchAssinatura } from '../services/assinatura';
import { assinaturaPagaAtiva } from '../utils/assinaturaAcesso';
import { fetchTrainingsMembro, getTrainingPdfUrl, TrainingRow } from '../services/database';
import { fetchTrilhasMembro, TrilhaComProgresso } from '../services/trilhas';
import { treinamentoVisivelPara } from '../utils/treinamentos';
import { resumoProgresso } from '../utils/trilhas';
import VideoYoutube from '../components/VideoYoutube';

const Treinamentos: React.FC = () => {
  const { currentUser, userType } = useAuth();
  const role = userType === 'company' ? 'company' : 'professional';
  const [treinamentos, setTreinamentos] = useState<TrainingRow[]>([]);
  const [trilhas, setTrilhas] = useState<TrilhaComProgresso[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [pago, setPago] = useState<boolean | null>(null);
  const [abrindoPdf, setAbrindoPdf] = useState<string | null>(null);

  // Gate de cliente: Capacitacao e exclusiva de assinantes pagos (mesma
  // regra do Radar TST). A regra de verdade fica na RLS e na Edge Function;
  // aqui e experiencia (bloqueio com CTA em vez de lista vazia).
  const userId = currentUser?.id;
  useEffect(() => {
    if (!userId) return;
    let vivo = true;
    const carregar = async () => {
      setLoading(true);
      setErro(false);
      try {
        const a = await fetchAssinatura(userId);
        if (!assinaturaPagaAtiva(a)) {
          if (vivo) {
            setPago(false);
            setLoading(false);
          }
          return;
        }
        if (vivo) setPago(true);
        const r = await fetchTrainingsMembro();
        if (!vivo) return;
        if (!r.success) {
          setErro(true);
        } else {
          // RLS ja filtra; o filtro local e defesa em profundidade.
          setTreinamentos(r.data.filter((t) => treinamentoVisivelPara(t, role)));
        }
        const rt = await fetchTrilhasMembro();
        if (!vivo) return;
        if (rt.success) {
          // Nesta etapa so trilhas abertas tem conteudo para o membro; as
          // trilhas com certificado chegam nas proximas etapas.
          setTrilhas(rt.data.filter((t) => t.kind === 'open'));
        }
      } catch {
        if (vivo) setErro(true);
      } finally {
        if (vivo) setLoading(false);
      }
    };
    carregar();
    return () => {
      vivo = false;
    };
  }, [userId, role]);

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
          <h1 className="font-poppins text-2xl font-bold text-gray-900">Capacitação</h1>
        </div>

        {loading && <p className="font-roboto text-gray-600">Carregando...</p>}

        {erro && !loading && (
          <div className="flex items-center space-x-2 text-red-600 font-roboto">
            <AlertTriangle size={18} aria-hidden="true" />
            <p>Não foi possível carregar. Tente novamente mais tarde.</p>
          </div>
        )}

        {!loading && !erro && pago === false && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <Lock className="w-10 h-10 text-green-deep mx-auto mb-4" aria-hidden="true" />
            <h2 className="font-poppins font-semibold text-lg text-soft-black mb-2">
              Conteúdo exclusivo para assinantes
            </h2>
            <p className="font-roboto text-gray-600 mb-6">
              A Capacitação reúne treinamentos para quem assina o plano pago,
              profissional ou empresa.
            </p>
            <Button as={Link} to="/planos">Ver planos</Button>
          </div>
        )}

        {!loading && !erro && pago === true && treinamentos.length === 0 && trilhas.length === 0 && (
          <p className="font-roboto text-gray-600">
            Nenhuma capacitação disponível no momento.
          </p>
        )}

        {pago === true && trilhas.length > 0 && (
          <div className="mb-8">
            <h2 className="font-poppins text-lg font-semibold text-gray-900 mb-3">Trilhas</h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {trilhas.map((t) => (
                <Link
                  key={t.id}
                  to={`${role === 'company' ? '/treinamentos-empresa' : '/treinamentos-profissional'}/trilha/${t.id}`}
                  className="block bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:border-green-deep transition-colors"
                >
                  <div>
                    <h3 className="font-poppins font-semibold text-gray-900">{t.titulo}</h3>
                    <span className="block text-sm text-gray-500 mt-1">
                      {resumoProgresso(t.totalSecoes, t.secoesConcluidas)}
                    </span>
                  </div>
                  {t.descricao && (
                    <p className="font-roboto text-sm text-gray-600 mt-1 line-clamp-2">{t.descricao}</p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {pago === true && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {treinamentos.map((t) => (
            <div key={t.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-5">
              <h2 className="font-poppins text-base sm:text-lg font-semibold text-gray-900">{t.title}</h2>
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
        )}
      </div>
    </div>
  );
};

export default Treinamentos;
