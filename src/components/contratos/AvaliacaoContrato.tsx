import React, { useState } from 'react';
import toast from 'react-hot-toast';
import Button from '../ui/Button';
import Estrelas from '../avaliacoes/Estrelas';
import {
  AvaliacaoPendente,
  AvaliacaoRow,
  COMENTARIO_AVALIACAO_MAX,
  estadoAvaliacaoContrato,
  formatarDataAvaliacao,
  mensagemErroAvaliacao,
  notaValida,
} from './avaliacaoGestao';
import { avaliarContrato, corrigirAvaliacao } from '../../services/database';

interface AvaliacaoContratoProps {
  contractId: string;
  statusContrato: string;
  contraparteNome: string | null;
  pendente?: AvaliacaoPendente;
  feita?: AvaliacaoRow;
  recebida?: AvaliacaoRow;
  onAtualizar: () => void;
}

// Bloco de avaliação de um contrato concluído: avaliar dentro do prazo,
// corrigir enquanto oculta, ou apenas mostrar a nota enviada.
const AvaliacaoContrato: React.FC<AvaliacaoContratoProps> = ({
  contractId,
  statusContrato,
  contraparteNome,
  pendente,
  feita,
  recebida,
  onAtualizar,
}) => {
  const [abrindo, setAbrindo] = useState(false);
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);

  const estado = estadoAvaliacaoContrato(statusContrato, Boolean(pendente), Boolean(feita), Boolean(recebida));
  if (estado === 'nao-concluido') return null;

  const abrirFormulario = () => {
    setNota(feita?.score ?? 0);
    setComentario(feita?.comment ?? '');
    setAbrindo(true);
  };

  const enviar = async () => {
    if (!notaValida(nota)) {
      toast.error('Escolha uma nota de 1 a 5 estrelas.');
      return;
    }
    setEnviando(true);
    try {
      const texto = comentario.trim() || null;
      if (feita) {
        await corrigirAvaliacao(contractId, nota, texto);
        toast.success('Avaliação corrigida. Ela continua oculta até a contraparte avaliar ou o prazo terminar.');
      } else {
        await avaliarContrato(contractId, nota, texto);
        toast.success('Avaliação enviada. Ela ficará oculta até a contraparte avaliar ou o prazo de 14 dias terminar.');
      }
      setAbrindo(false);
      onAtualizar();
    } catch (error) {
      console.error('Erro ao avaliar contrato:', error);
      const mensagem = error instanceof Error ? error.message : '';
      toast.error(mensagemErroAvaliacao(mensagem));
      onAtualizar();
    } finally {
      setEnviando(false);
    }
  };

  if (abrindo) {
    return (
      <div className="mt-2 bg-neutral-gray rounded-lg p-3">
        <p className="font-roboto text-sm text-soft-black mb-2">
          {feita ? 'Corrigir sua avaliação' : `Avaliar ${contraparteNome ?? 'a contraparte'}`} (fica oculta até os dois avaliarem ou o prazo terminar)
        </p>
        <div className="mb-2">
          <Estrelas nota={nota} tamanho={28} interativo onSelecionar={setNota} rotuloAcessivel="Escolha a nota" />
        </div>
        <textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          maxLength={COMENTARIO_AVALIACAO_MAX}
          rows={3}
          placeholder="Comentário opcional"
          className="w-full font-roboto text-sm rounded-lg border border-gray-200 p-2 mb-2 focus:outline-none focus:ring-2 focus:ring-green-deep"
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={enviar} loading={enviando}>
            {feita ? 'Salvar correção' : 'Enviar avaliação'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAbrindo(false)} disabled={enviando}>
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  if (estado === 'pode-avaliar') {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={abrirFormulario}>Avaliar</Button>
        {pendente && (
          <span className="font-roboto text-xs text-gray-500">
            Avalie até {formatarDataAvaliacao(pendente.prazo_fim)}
          </span>
        )}
      </div>
    );
  }

  if (estado === 'prazo-encerrado') {
    return (
      <p className="mt-2 font-roboto text-xs text-gray-400">Prazo de avaliação encerrado.</p>
    );
  }

  // enviada-oculta ou revelada: mostra a própria avaliação
  return (
    <div className="mt-2">
      <p className="font-roboto text-xs text-gray-500 mb-1">
        Sua avaliação{estado === 'enviada-oculta' ? ' (oculta até a contraparte avaliar ou o prazo terminar)' : ''}:
      </p>
      <Estrelas nota={feita?.score ?? 0} rotuloAcessivel={`Sua nota: ${feita?.score ?? 0} de 5`} />
      {feita?.comment && (
        <p className="font-roboto text-sm text-gray-600 mt-1">{feita.comment}</p>
      )}
      {estado === 'enviada-oculta' && (
        <div className="mt-2">
          <Button size="sm" variant="ghost" onClick={abrirFormulario}>Corrigir avaliação</Button>
        </div>
      )}
    </div>
  );
};

export default AvaliacaoContrato;
