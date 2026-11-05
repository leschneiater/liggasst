import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle2,
  FileText,
  GraduationCap,
  Link2,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';
import VideoYoutube from '../components/VideoYoutube';
import { useAuth } from '../contexts/AuthContext';
import { fetchAssinatura } from '../services/assinatura';
import { assinaturaPagaAtiva } from '../utils/assinaturaAcesso';
import {
  concluirSecao,
  fetchTentativaRecente,
  fetchTrilhaDetalhe,
  getSecaoTrilhaPdfUrl,
  marcarEbookLida,
  SecaoTrilha,
  Trilha,
} from '../services/trilhas';
import {
  ebookCompleto,
  formatarDataLiberacao,
  podeConcluirSecao,
  resumoEbook,
  resumoProgresso,
  secoesConteudo,
  secoesEbook,
  SituacaoProva,
  situacaoProva,
  trilhaConcluida,
} from '../utils/trilhas';
import ProvaTrilha from '../components/ProvaTrilha';

// Pagina da trilha (Etapa 2): conteudo aberto das secoes + botao "Concluir
// secao", que so habilita depois de abrir o conteudo daquela secao nesta
// visita. A regra de acesso vale de verdade na RLS e na Edge Function; aqui
// e experiencia.
const TrilhaDetalhe: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { currentUser, userType } = useAuth();
  const listaPath = userType === 'company' ? '/treinamentos-empresa' : '/treinamentos-profissional';
  const [trilha, setTrilha] = useState<Trilha | null>(null);
  const [secoes, setSecoes] = useState<SecaoTrilha[]>([]);
  const [concluidas, setConcluidas] = useState<Set<string>>(new Set());
  const [abertas, setAbertas] = useState<Set<string>>(new Set());
  const [ebookLidas, setEbookLidas] = useState<Set<string>>(new Set());
  const [ebookAbertas, setEbookAbertas] = useState<Set<string>>(new Set());
  const [marcandoLeitura, setMarcandoLeitura] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [pago, setPago] = useState<boolean | null>(null);
  const [abrindoPdf, setAbrindoPdf] = useState<string | null>(null);
  const [concluindo, setConcluindo] = useState<string | null>(null);
  const [prova, setProva] = useState<SituacaoProva>({ tipo: 'livre' });
  const [provaAberta, setProvaAberta] = useState(false);

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
        const r = await fetchTrilhaDetalhe(id);
        if (!vivo) return;
        if (!r.success || !r.data) {
          setErro(true);
        } else {
          setTrilha(r.data.trilha);
          setSecoes(r.data.secoes);
          setConcluidas(new Set(r.data.concluidas));
          setEbookLidas(new Set(r.data.ebookLidas));
          if (r.data.trilha.kind === 'certified') {
            const tent = await fetchTentativaRecente(id);
            if (vivo && tent.success) setProva(situacaoProva(tent.data));
          }
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
  }, [userId, id]);

  const marcarAberta = (secaoId: string) =>
    setAbertas((prev) => new Set(prev).add(secaoId));

  const abrirPdf = async (secao: SecaoTrilha) => {
    setAbrindoPdf(secao.id);
    const r = await getSecaoTrilhaPdfUrl(secao.id);
    setAbrindoPdf(null);
    if (r.success && r.signedUrl) {
      marcarAberta(secao.id);
      window.open(r.signedUrl, '_blank', 'noopener,noreferrer');
    } else {
      toast.error('Não foi possível abrir o PDF. Tente novamente.');
    }
  };

  const concluir = async (secao: SecaoTrilha) => {
    if (!trilha) return;
    setConcluindo(secao.id);
    const r = await concluirSecao(trilha.id, secao.id);
    setConcluindo(null);
    if (!r.success) {
      toast.error('Não foi possível concluir a seção. Tente novamente.');
      return;
    }
    setConcluidas((prev) => new Set(prev).add(secao.id));
    if (r.seloNovo) {
      toast.success(`Selo conquistado: ${trilha.titulo}! Ele já aparece no seu perfil.`);
    } else {
      toast.success('Seção concluída.');
    }
  };

  // Etapa 4: ebook de revisao. Ler = expandir o texto no app; so entao o
  // botao "Marcar como lida" habilita (mesmo cuidado da etapa 2). A regra
  // que libera a nova tentativa vale no servidor (trail_exam_iniciar).
  const alternarEbook = (secaoId: string) =>
    setEbookAbertas((prev) => {
      const novo = new Set(prev);
      if (novo.has(secaoId)) novo.delete(secaoId);
      else novo.add(secaoId);
      return novo;
    });

  const marcarLida = async (secao: SecaoTrilha) => {
    setMarcandoLeitura(secao.id);
    const r = await marcarEbookLida(secao.id);
    setMarcandoLeitura(null);
    if (!r.success) {
      toast.error('Não foi possível marcar a leitura. Tente novamente.');
      return;
    }
    setEbookLidas((prev) => new Set(prev).add(secao.id));
    toast.success('Leitura registrada.');
  };

  const listaConteudo = secoesConteudo(secoes);
  const listaEbook = secoesEbook(secoes);
  const temEbook = listaEbook.length > 0;

  return (
    <div className="min-h-screen bg-neutral-gray py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          to={listaPath}
          className="inline-flex items-center space-x-1 text-sm text-green-deep hover:underline mb-4"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Voltar para a Capacitação</span>
        </Link>

        {loading && <p className="font-roboto text-gray-600">Carregando...</p>}

        {erro && !loading && (
          <div className="flex items-center space-x-2 text-red-600 font-roboto">
            <AlertTriangle size={18} aria-hidden="true" />
            <p>Trilha não encontrada ou indisponível.</p>
          </div>
        )}

        {!loading && !erro && pago === false && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <Lock className="w-10 h-10 text-green-deep mx-auto mb-4" aria-hidden="true" />
            <h2 className="font-poppins font-semibold text-lg text-soft-black mb-2">
              Conteúdo exclusivo para assinantes
            </h2>
            <p className="font-roboto text-gray-600 mb-6">
              As trilhas fazem parte da Capacitação, exclusiva de quem assina o
              plano pago, profissional ou empresa.
            </p>
            <Button as={Link} to="/planos">Ver planos</Button>
          </div>
        )}

        {!loading && !erro && pago === true && trilha && (
          <>
            <div className="flex items-center space-x-3 mb-2">
              <GraduationCap className="w-7 h-7 text-green-deep" aria-hidden="true" />
              <h1 className="font-poppins text-2xl font-bold text-gray-900">{trilha.titulo}</h1>
            </div>
            <div className="flex items-center space-x-3 mb-6">
              <p className="font-roboto text-gray-600">
                {resumoProgresso(listaConteudo.length, concluidas.size)}
              </p>
              {trilha.kind === 'open' && trilhaConcluida(listaConteudo.length, concluidas.size) && (
                <span className="inline-flex items-center space-x-1 text-sm bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                  <Award className="w-4 h-4" aria-hidden="true" />
                  <span>Selo conquistado</span>
                </span>
              )}
            </div>
            {trilha.descricao && (
              <p className="font-roboto text-gray-600 mb-6 whitespace-pre-line">{trilha.descricao}</p>
            )}

            <div className="space-y-4">
              {listaConteudo.map((s, i) => {
                const feita = concluidas.has(s.id);
                return (
                  <div key={s.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="font-poppins font-semibold text-gray-900">
                        {i + 1}. {s.titulo}
                      </h2>
                      {feita && (
                        <span className="inline-flex items-center space-x-1 text-sm text-green-700">
                          <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                          <span>Concluída</span>
                        </span>
                      )}
                    </div>

                    {s.content_type === 'youtube' && (
                      <div className="mt-3" onClick={() => marcarAberta(s.id)}>
                        <VideoYoutube youtubeUrl={s.conteudo} titulo={s.titulo} />
                      </div>
                    )}
                    {s.content_type === 'link' && (
                      <div className="mt-3">
                        <a
                          href={s.conteudo}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => marcarAberta(s.id)}
                          className="inline-flex items-center space-x-2 text-sm font-medium text-green-deep hover:underline"
                        >
                          <Link2 className="w-4 h-4" aria-hidden="true" />
                          <span>Acessar material externo</span>
                        </a>
                      </div>
                    )}
                    {s.content_type === 'pdf' && (
                      <div className="mt-3">
                        <Button
                          variant="secondary"
                          onClick={() => abrirPdf(s)}
                          disabled={abrindoPdf === s.id}
                        >
                          <FileText className="w-4 h-4 mr-2" aria-hidden="true" />
                          {abrindoPdf === s.id ? 'Abrindo...' : 'Abrir material em PDF'}
                        </Button>
                      </div>
                    )}

                    <div className="mt-4">
                      <Button
                        variant={feita ? 'ghost' : 'outline'}
                        size="sm"
                        onClick={() => concluir(s)}
                        disabled={
                          feita ||
                          concluindo === s.id ||
                          !podeConcluirSecao(s.id, abertas, concluidas)
                        }
                      >
                        {concluindo === s.id
                          ? 'Concluindo...'
                          : feita
                            ? 'Seção concluída'
                            : abertas.has(s.id)
                              ? 'Concluir seção'
                              : 'Abra o conteúdo para concluir'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {trilha.kind === 'certified' && temEbook && (
              <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="w-5 h-5 text-green-deep" aria-hidden="true" />
                    <h2 className="font-poppins font-semibold text-gray-900">Ebook de revisão</h2>
                  </div>
                  <span className="font-roboto text-sm text-gray-600">
                    {resumoEbook(listaEbook.length, ebookLidas.size)}
                  </span>
                </div>
                <p className="font-roboto text-sm text-gray-600 mb-4">
                  {ebookCompleto(listaEbook.length, ebookLidas.size)
                    ? 'Você leu o ebook até o final.'
                    : 'Depois de uma tentativa sem aprovação, a liberação da próxima também pede a leitura completa do ebook.'}
                </p>
                <div className="space-y-3">
                  {listaEbook.map((s, i) => {
                    const lida = ebookLidas.has(s.id);
                    const aberta = ebookAbertas.has(s.id);
                    return (
                      <div key={s.id} className="rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-poppins font-medium text-gray-900">
                            {i + 1}. {s.titulo}
                          </h3>
                          {lida && (
                            <span className="inline-flex items-center space-x-1 text-sm text-green-700">
                              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                              <span>Lida</span>
                            </span>
                          )}
                        </div>
                        <div className="mt-3">
                          <Button variant="ghost" size="sm" onClick={() => alternarEbook(s.id)}>
                            {aberta ? 'Fechar texto' : 'Ler esta parte'}
                          </Button>
                        </div>
                        {aberta && (
                          <p className="mt-3 font-roboto text-gray-700 whitespace-pre-line">
                            {s.conteudo}
                          </p>
                        )}
                        <div className="mt-3">
                          <Button
                            variant={lida ? 'ghost' : 'outline'}
                            size="sm"
                            onClick={() => marcarLida(s)}
                            disabled={lida || marcandoLeitura === s.id || !aberta}
                          >
                            {marcandoLeitura === s.id
                              ? 'Registrando...'
                              : lida
                                ? 'Leitura registrada'
                                : aberta
                                  ? 'Marcar como lida'
                                  : 'Leia o texto para marcar'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {trilha.kind === 'certified' && (
              <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                <div className="flex items-center space-x-2 mb-2">
                  <GraduationCap className="w-5 h-5 text-green-deep" aria-hidden="true" />
                  <h2 className="font-poppins font-semibold text-gray-900">Avaliação final</h2>
                </div>
                {prova.tipo === 'aprovado' && (
                  <>
                    <p className="font-roboto text-gray-700 mb-4">
                      Você foi aprovado com nota <strong>{prova.score}%</strong>. Seu certificado
                      está disponível.
                    </p>
                    <Button onClick={() => navigate(`/treinamentos-profissional/certificado/${trilha.id}`)}>
                      Ver certificado
                    </Button>
                  </>
                )}
                {prova.tipo === 'bloqueado' && (
                  <>
                    <p className="font-roboto text-gray-700">
                      Sua última tentativa não atingiu a nota mínima. Nova tentativa liberada em{' '}
                      <strong>{formatarDataLiberacao(prova.lockedUntil)}</strong>.
                    </p>
                    {temEbook && !ebookCompleto(listaEbook.length, ebookLidas.size) && (
                      <p className="font-roboto text-gray-600 mt-2">
                        Aproveite para ler o ebook de revisão até o final ({' '}
                        {resumoEbook(listaEbook.length, ebookLidas.size)}): a nova tentativa também
                        pede a leitura completa.
                      </p>
                    )}
                  </>
                )}
                {prova.tipo === 'livre' && !trilhaConcluida(listaConteudo.length, concluidas.size) && (
                  <p className="font-roboto text-gray-600">
                    Conclua todas as seções para liberar a avaliação. Nota mínima:{' '}
                    {trilha.exam_pass_score}%.
                  </p>
                )}
                {prova.tipo === 'livre' && trilhaConcluida(listaConteudo.length, concluidas.size) && (
                  <>
                    <p className="font-roboto text-gray-600 mb-4">
                      {trilha.exam_question_count} questões. Nota mínima: {trilha.exam_pass_score}%.
                    </p>
                    <Button onClick={() => setProvaAberta(true)}>Iniciar avaliação</Button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {provaAberta && trilha && (
        <ProvaTrilha
          trailId={trilha.id}
          tituloTrilha={trilha.titulo}
          temEbook={temEbook}
          onFechar={(resultado) => {
            setProvaAberta(false);
            if (resultado) {
              setProva(
                resultado.passed
                  ? { tipo: 'aprovado', score: resultado.score }
                  : resultado.lockedUntil
                    ? { tipo: 'bloqueado', lockedUntil: resultado.lockedUntil }
                    : { tipo: 'livre' },
              );
            }
          }}
        />
      )}
    </div>
  );
};

export default TrilhaDetalhe;
