import React, { useEffect, useState } from 'react';
import { AlertTriangle, Award, BookOpen, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from './ui/Button';
import { enviarProva, iniciarProva } from '../services/trilhas';
import {
  ErroInicioProva,
  formatarDataLiberacao,
  ProvaQuestao,
  ResultadoProva,
} from '../utils/trilhas';

type Fase =
  | { nome: 'carregando' }
  | { nome: 'erro'; erro: ErroInicioProva; lockedUntil: string | null }
  | { nome: 'prova'; attemptId: string; questoes: ProvaQuestao[]; passScore: number }
  | { nome: 'resultado'; resultado: ResultadoProva };

const MENSAGEM_ERRO: Record<ErroInicioProva, string> = {
  indisponivel: 'Esta avaliação não está disponível para a sua conta.',
  secoes_pendentes: 'Conclua todas as seções da trilha para liberar a avaliação.',
  bloqueado: 'Sua última tentativa não atingiu a nota mínima.',
  banco_insuficiente: 'A avaliação desta trilha ainda está em preparação. Tente mais tarde.',
  nao_autenticado: 'Sessão expirada. Entre de novo para fazer a avaliação.',
  desconhecido: 'Não foi possível iniciar a avaliação. Tente novamente.',
};

// Prova da trilha (Etapa 3): sorteio e correcao no servidor; o gabarito
// nunca chega ao navegador. Uma questao por card, todas na mesma tela.
const ProvaTrilha: React.FC<{
  trailId: string;
  tituloTrilha: string;
  onFechar: (resultado: ResultadoProva | null) => void;
}> = ({ trailId, tituloTrilha, onFechar }) => {
  const [fase, setFase] = useState<Fase>({ nome: 'carregando' });
  const [respostas, setRespostas] = useState<(number | null)[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [iniciado, setIniciado] = useState(false);

  const iniciar = async () => {
    setIniciado(true);
    setFase({ nome: 'carregando' });
    const r = await iniciarProva(trailId);
    if (!r.success || !r.data) {
      setFase({ nome: 'erro', erro: r.erro ?? 'desconhecido', lockedUntil: r.lockedUntil ?? null });
      return;
    }
    setRespostas(Array(r.data.questoes.length).fill(null));
    setFase({
      nome: 'prova',
      attemptId: r.data.attemptId,
      questoes: r.data.questoes,
      passScore: r.data.passScore,
    });
  };

  // Inicia ao montar (o botao "Iniciar avaliacao" da trilha abre este componente).
  useEffect(() => {
    if (!iniciado) void iniciar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iniciado]);

  const responder = (qi: number, oi: number) =>
    setRespostas((prev) => prev.map((v, i) => (i === qi ? oi : v)));

  const enviar = async () => {
    if (fase.nome !== 'prova') return;
    setEnviando(true);
    const r = await enviarProva(fase.attemptId, respostas);
    setEnviando(false);
    if (!r.success || !r.data) {
      if (r.erro === 'ja_finalizada') {
        toast.error('Esta avaliação já foi enviada.');
        onFechar(null);
        return;
      }
      toast.error('Não foi possível enviar a avaliação. Tente novamente.');
      return;
    }
    setFase({ nome: 'resultado', resultado: r.data });
  };

  const respondidas = respostas.filter((v) => v !== null).length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50">
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-2xl mx-auto bg-neutral-gray rounded-xl shadow-xl">
          <div className="flex items-center justify-between bg-white rounded-t-xl px-5 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-green-deep" aria-hidden="true" />
              <h2 className="font-poppins font-semibold text-gray-900">
                Avaliação: {tituloTrilha}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onFechar(null)}
              aria-label="Fechar avaliação"
              className="text-gray-500 hover:text-gray-800"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {fase.nome === 'carregando' && (
              <p className="font-roboto text-gray-600">Preparando sua avaliação...</p>
            )}

            {fase.nome === 'erro' && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" aria-hidden="true" />
                <p className="font-roboto text-gray-700 mb-1">{MENSAGEM_ERRO[fase.erro]}</p>
                {fase.erro === 'bloqueado' && fase.lockedUntil && (
                  <p className="font-roboto text-gray-600">
                    Nova tentativa liberada em{' '}
                    <strong>{formatarDataLiberacao(fase.lockedUntil)}</strong>.
                  </p>
                )}
                <div className="mt-4">
                  <Button variant="outline" onClick={() => onFechar(null)}>Voltar para a trilha</Button>
                </div>
              </div>
            )}

            {fase.nome === 'prova' && (
              <>
                <p className="font-roboto text-sm text-gray-600">
                  {fase.questoes.length} questões. Nota mínima para aprovação: {fase.passScore}%.
                </p>
                {fase.questoes.map((q, qi) => (
                  <fieldset
                    key={q.q}
                    className="bg-white rounded-lg border border-gray-200 p-5"
                  >
                    <legend className="sr-only">Questão {qi + 1}</legend>
                    <p className="font-poppins font-medium text-gray-900 mb-3">
                      {qi + 1}. {q.enunciado}
                    </p>
                    <div className="space-y-2">
                      {q.opcoes.map((op, oi) => (
                        <label
                          key={oi}
                          className={`flex items-start space-x-2 rounded-lg border px-3 py-2 cursor-pointer text-sm ${
                            respostas[qi] === oi
                              ? 'border-green-deep bg-green-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`questao-${qi}`}
                            checked={respostas[qi] === oi}
                            onChange={() => responder(qi, oi)}
                            className="mt-0.5 accent-green-deep"
                          />
                          <span className="font-roboto text-gray-800">{op}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
                <div className="sticky bottom-0 bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between">
                  <span className="font-roboto text-sm text-gray-600">
                    {respondidas} de {fase.questoes.length} respondidas
                  </span>
                  <Button onClick={enviar} disabled={enviando || respondidas === 0}>
                    {enviando ? 'Enviando...' : 'Enviar avaliação'}
                  </Button>
                </div>
              </>
            )}

            {fase.nome === 'resultado' && fase.resultado.passed && (
              <div className="bg-white rounded-lg border border-green-200 p-8 text-center">
                <Award className="w-12 h-12 text-green-deep mx-auto mb-4" aria-hidden="true" />
                <h3 className="font-poppins font-semibold text-lg text-gray-900 mb-2">
                  Parabéns, você foi aprovado!
                </h3>
                <p className="font-roboto text-gray-700 mb-2">
                  Sua nota: <strong>{fase.resultado.score}%</strong> (mínimo{' '}
                  {fase.resultado.passScore}%).
                </p>
                <p className="font-roboto text-gray-600 mb-6">
                  Seu certificado será emitido na sua área.
                </p>
                <Button onClick={() => onFechar(fase.resultado)}>Voltar para a trilha</Button>
              </div>
            )}

            {fase.nome === 'resultado' && !fase.resultado.passed && (
              <div className="bg-white rounded-lg border border-amber-200 p-8">
                <div className="text-center mb-6">
                  <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" aria-hidden="true" />
                  <h3 className="font-poppins font-semibold text-lg text-gray-900 mb-2">
                    Você não atingiu a nota mínima
                  </h3>
                  <p className="font-roboto text-gray-700">
                    Sua nota: <strong>{fase.resultado.score}%</strong> (mínimo{' '}
                    {fase.resultado.passScore}%).
                  </p>
                  {fase.resultado.lockedUntil && (
                    <p className="font-roboto text-gray-600 mt-2">
                      Nova tentativa liberada em{' '}
                      <strong>{formatarDataLiberacao(fase.resultado.lockedUntil)}</strong>.
                    </p>
                  )}
                </div>
                {fase.resultado.topicos.length > 0 && (
                  <div>
                    <h4 className="font-poppins font-medium text-gray-900 mb-2">
                      Revise estes conteúdos antes da próxima tentativa:
                    </h4>
                    <ul className="list-disc list-inside space-y-1">
                      {fase.resultado.topicos.map((t) => (
                        <li key={t} className="font-roboto text-gray-700">{t}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-6 text-center">
                  <Button variant="outline" onClick={() => onFechar(fase.resultado)}>
                    Voltar para a trilha
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProvaTrilha;
