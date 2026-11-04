// Area do funcionario (papel 'employee', feature 3 do plano Empresa pago):
// ve os treinamentos que a empresa atribuiu a ele, abre o conteudo (PDF via
// Edge Function, video do YouTube ou link) e marca a conclusao. A empresa
// acompanha o progresso em /capacitacao-equipe; o certificado chega com a
// infra de certificados (etapa separada).
import React, { useCallback, useEffect, useState } from 'react';
import { GraduationCap, FileText, ExternalLink, Link2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';
import {
  AtribuicaoTreinamento,
  fetchMinhasAtribuicoes,
  concluirAtribuicao,
} from '../services/capacitacaoEquipe';
import { getTrainingPdfUrl } from '../services/database';
import { rotuloStatusAtribuicao, progressoDaEquipe } from '../utils/capacitacaoEquipe';
import { extrairYoutubeId, urlEmbedYoutube } from '../utils/youtube';

const MinhaCapacitacao: React.FC = () => {
  const [atribuicoes, setAtribuicoes] = useState<AtribuicaoTreinamento[]>([]);
  const [semVinculo, setSemVinculo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [abrindoPdf, setAbrindoPdf] = useState<string | null>(null);
  const [concluindo, setConcluindo] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const r = await fetchMinhasAtribuicoes();
    if (!r.success) {
      toast.error('Não foi possível carregar seus treinamentos. Tente novamente.');
    } else {
      setAtribuicoes(r.data);
      setSemVinculo((r.vinculos ?? []).length === 0);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const abrirPdf = async (a: AtribuicaoTreinamento) => {
    setAbrindoPdf(a.id);
    const r = await getTrainingPdfUrl(a.training_id);
    setAbrindoPdf(null);
    if (r.success && r.signedUrl) {
      window.open(r.signedUrl, '_blank', 'noopener,noreferrer');
    } else {
      toast.error('Não foi possível abrir o PDF. Tente novamente.');
    }
  };

  const concluir = async (a: AtribuicaoTreinamento) => {
    setConcluindo(a.id);
    const r = await concluirAtribuicao(a.id);
    setConcluindo(null);
    if (!r.success) {
      toast.error('Não foi possível marcar como concluído. Tente novamente.');
      return;
    }
    toast.success('Treinamento concluído! Sua empresa já consegue ver.');
    carregar();
  };

  const progresso = progressoDaEquipe(atribuicoes);

  return (
    <div className="min-h-screen bg-neutral-gray py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="font-poppins font-bold text-3xl text-soft-black mb-2">
            Minha Capacitação
          </h1>
          <p className="font-roboto text-gray-600">
            Estes são os treinamentos de segurança do trabalho que a sua empresa atribuiu a você.
            Faça o conteúdo e marque a conclusão. Ela aparece para a empresa na hora.
          </p>
        </div>

        {loading ? (
          <p className="font-roboto text-gray-600">Carregando...</p>
        ) : semVinculo ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6" data-testid="sem-vinculo">
            <p className="font-roboto text-gray-700">
              Sua conta ainda não está vinculada a uma empresa. Peça ao responsável pela SST na
              sua empresa para cadastrar este mesmo e-mail na área <strong>Capacitação da Equipe</strong>.
            </p>
          </div>
        ) : atribuicoes.length === 0 ? (
          <p className="font-roboto text-gray-600" data-testid="sem-treinamentos">
            Nenhum treinamento atribuído no momento. Quando a empresa atribuir, ele aparece aqui.
          </p>
        ) : (
          <>
            <div className="mb-6" data-testid="progresso-funcionario">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-roboto bg-green-light text-green-deep">
                {progresso.concluidos} de {progresso.total} concluídos ({progresso.percentual}%)
              </span>
            </div>
            <div className="space-y-4">
              {atribuicoes.map((a) => {
                const t = a.trainings;
                const youtubeId = t?.youtube_url ? extrairYoutubeId(t.youtube_url) : null;
                return (
                  <div key={a.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6" data-testid={`atribuicao-${a.id}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-green-deep" aria-hidden="true" />
                        <h2 className="font-poppins font-semibold text-lg text-soft-black">
                          {t?.title ?? 'Treinamento'}
                        </h2>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-roboto ${
                          a.status === 'completed'
                            ? 'bg-green-light text-green-deep'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {rotuloStatusAtribuicao(a.status)}
                        {a.status === 'completed' && a.completed_at
                          ? ` em ${new Date(a.completed_at).toLocaleDateString('pt-BR')}`
                          : ''}
                      </span>
                    </div>

                    {youtubeId && (
                      <div className="relative w-full mb-3" style={{ paddingTop: '56.25%' }}>
                        <iframe
                          title={t?.title ?? 'Vídeo do treinamento'}
                          src={urlEmbedYoutube(youtubeId)}
                          className="absolute inset-0 w-full h-full rounded-lg"
                          loading="lazy"
                          referrerPolicy="strict-origin-when-cross-origin"
                          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {t?.pdf_path && (
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={FileText}
                          onClick={() => abrirPdf(a)}
                          disabled={abrindoPdf === a.id}
                        >
                          {abrindoPdf === a.id ? 'Abrindo...' : 'Abrir PDF'}
                        </Button>
                      )}
                      {t?.link_url && (
                        <a
                          href={t.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-green-deep text-green-deep font-roboto text-sm hover:bg-green-50"
                        >
                          <Link2 className="w-4 h-4" aria-hidden="true" />
                          <span>Abrir link</span>
                          <ExternalLink className="w-3 h-3" aria-hidden="true" />
                        </a>
                      )}
                      {a.status === 'assigned' && (
                        <Button
                          size="sm"
                          icon={CheckCircle2}
                          onClick={() => concluir(a)}
                          disabled={concluindo === a.id}
                        >
                          {concluindo === a.id ? 'Salvando...' : 'Marcar como concluído'}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MinhaCapacitacao;
