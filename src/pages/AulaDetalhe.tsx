// Pagina da aula: conteudo completo de uma capacitacao (desde 05/11).
// O card da grade mostra so titulo e chamada; o video/material mora aqui.
// Mesmo gate de assinante da lista (experiencia); a regra de verdade e a RLS.
import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Link2, Lock, AlertTriangle } from 'lucide-react';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { fetchAssinatura } from '../services/assinatura';
import { assinaturaPagaAtiva } from '../utils/assinaturaAcesso';
import { fetchTrainingMembro, getTrainingPdfUrl, TrainingRow } from '../services/database';
import { treinamentoVisivelPara } from '../utils/treinamentos';
import VideoYoutube from '../components/VideoYoutube';

const AulaDetalhe: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentUser, userType } = useAuth();
  const role = userType === 'company' ? 'company' : 'professional';
  const listaPath = role === 'company' ? '/treinamentos-empresa' : '/treinamentos-profissional';
  const [treinamento, setTreinamento] = useState<TrainingRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [pago, setPago] = useState<boolean | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const userId = currentUser?.id;
  useEffect(() => {
    if (!userId || !id) return;
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
        const r = await fetchTrainingMembro(id);
        if (!vivo) return;
        if (!r.success) {
          setErro(true);
        } else {
          // Inexistente ou de outro publico: mesma tela de "nao encontrado".
          setTreinamento(r.data && treinamentoVisivelPara(r.data, role) ? r.data : null);
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
  }, [userId, id, role]);

  // PDF a vista (desde 05/11): busca a URL assinada ao abrir a aula e
  // embute o documento; o link "Abrir em nova aba" fica para quem nao renderiza
  // PDF embutido (ex.: Chrome do celular).
  const treinamentoId = treinamento?.id;
  const temPdf = Boolean(treinamento?.pdf_path);
  useEffect(() => {
    if (!treinamentoId || !temPdf) return;
    let vivo = true;
    getTrainingPdfUrl(treinamentoId).then((r) => {
      if (vivo && r.success && r.signedUrl) setPdfUrl(r.signedUrl);
    });
    return () => {
      vivo = false;
    };
  }, [treinamentoId, temPdf]);

  return (
    <div className="min-h-screen bg-neutral-gray py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          to={listaPath}
          className="inline-flex items-center font-roboto text-green-deep hover:underline mb-6"
        >
          <ArrowLeft size={18} className="mr-1" aria-hidden="true" /> Voltar para a Capacitação
        </Link>

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

        {!loading && !erro && pago === true && !treinamento && (
          <p className="font-roboto text-gray-600">Treinamento não encontrado.</p>
        )}

        {!loading && !erro && pago === true && treinamento && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 sm:p-8">
            <h1 className="font-poppins text-2xl font-bold text-gray-900">{treinamento.title}</h1>
            {treinamento.description && (
              <p className="font-roboto text-gray-600 mt-2 whitespace-pre-line">{treinamento.description}</p>
            )}
            {treinamento.youtube_url && (
              <div className="mt-6">
                <VideoYoutube youtubeUrl={treinamento.youtube_url} titulo={treinamento.title} />
              </div>
            )}
            {treinamento.link_url && (
              <div className="mt-6">
                <a
                  href={treinamento.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 text-sm font-medium text-green-deep hover:underline"
                >
                  <Link2 className="w-4 h-4" aria-hidden="true" />
                  <span>Acessar material externo</span>
                </a>
              </div>
            )}
            {treinamento.pdf_path && (
              <div className="mt-6">
                <div className="flex items-center space-x-2 mb-2">
                  <FileText className="w-4 h-4 text-green-deep" aria-hidden="true" />
                  <h2 className="font-poppins font-semibold text-gray-900">Material em PDF</h2>
                </div>
                {pdfUrl ? (
                  <object
                    data={pdfUrl}
                    type="application/pdf"
                    title="Material em PDF"
                    className="w-full h-[70vh] rounded-lg border border-gray-200 bg-gray-50"
                  >
                    <p className="font-roboto text-sm text-gray-600 p-4">
                      Seu navegador não mostra o PDF aqui.{' '}
                      <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-green-deep hover:underline">
                        Abrir em nova aba
                      </a>
                    </p>
                  </object>
                ) : (
                  <p className="font-roboto text-sm text-gray-500">Carregando PDF...</p>
                )}
                {pdfUrl && (
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block font-roboto text-sm text-green-deep hover:underline mt-2"
                  >
                    Abrir PDF em nova aba
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AulaDetalhe;
