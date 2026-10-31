import React, { useEffect, useState } from 'react';
import { Flag } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../ui/Button';
import Estrelas from './Estrelas';
import { useAuth } from '../../contexts/AuthContext';
import {
  AvaliacaoPerfil,
  COMENTARIO_AVALIACAO_MAX,
  ResumoAvaliacoes,
  ROTULOS_MOTIVO_DENUNCIA,
  formatarDataAvaliacao,
  textoResumoAvaliacoes,
} from '../contratos/avaliacaoGestao';
import { avaliacoesDoPerfil, avaliacoesResumo, reportAvaliacao } from '../../services/database';

interface AvaliacoesPerfilProps {
  perfilId: string;
}

// Vitrine pública (para cadastrados) das avaliações RECEBIDAS por um
// perfil: média, total e lista com autor, nota e comentário. Inclui o
// botão de denúncia (revisão pela administração).
const AvaliacoesPerfil: React.FC<AvaliacoesPerfilProps> = ({ perfilId }) => {
  const { currentUser } = useAuth();
  const [resumo, setResumo] = useState<ResumoAvaliacoes | null>(null);
  const [lista, setLista] = useState<AvaliacaoPerfil[]>([]);
  const [erro, setErro] = useState(false);
  const [denuncia, setDenuncia] = useState<AvaliacaoPerfil | null>(null);
  const [motivo, setMotivo] = useState('conteudo-improprio');
  const [detalhes, setDetalhes] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let ativo = true;
    Promise.all([avaliacoesResumo(perfilId), avaliacoesDoPerfil(perfilId)])
      .then(([r, l]) => {
        if (!ativo) return;
        setResumo(r);
        setLista(l);
      })
      .catch((e) => {
        console.error('Erro ao carregar avaliações:', e);
        if (ativo) setErro(true);
      });
    return () => { ativo = false; };
  }, [perfilId]);

  const enviarDenuncia = async () => {
    if (!denuncia) return;
    setEnviando(true);
    const r = await reportAvaliacao(denuncia.id, motivo, detalhes.trim());
    setEnviando(false);
    if (r.success) {
      toast.success('Denúncia enviada. A administração vai revisar; enquanto isso o comentário fica oculto.');
      setDenuncia(null);
      setDetalhes('');
    } else {
      toast.error('Não foi possível enviar a denúncia. Tente novamente.');
    }
  };

  if (erro) {
    return <p className="font-roboto text-sm text-gray-500">Não foi possível carregar as avaliações.</p>;
  }
  if (!resumo) {
    return <p className="font-roboto text-sm text-gray-500">Carregando avaliações...</p>;
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Estrelas nota={resumo.media ?? 0} tamanho={20} rotuloAcessivel={`Média ${resumo.media ?? 0} de 5`} />
        <span className="font-roboto text-sm text-gray-600">
          {textoResumoAvaliacoes(resumo.media, resumo.total)}
        </span>
      </div>

      {lista.length > 0 && (
        <ul className="space-y-4">
          {lista.map((a) => (
            <li key={a.id} className="border border-gray-100 rounded-lg p-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <Estrelas nota={a.score} rotuloAcessivel={`Nota ${a.score} de 5`} />
                  <span className="font-roboto text-sm font-medium text-soft-black">
                    {a.autor_nome ?? 'Usuário'}
                  </span>
                </div>
                <span className="font-roboto text-xs text-gray-400">
                  {formatarDataAvaliacao(a.created_at)}
                </span>
              </div>
              {a.comment && (
                <p className="font-roboto text-sm text-gray-600">{a.comment}</p>
              )}
              {currentUser?.id !== a.rater_id && (
                <button
                  type="button"
                  onClick={() => { setDenuncia(a); setMotivo('conteudo-improprio'); setDetalhes(''); }}
                  className="mt-1 inline-flex items-center gap-1 font-roboto text-xs text-gray-400 hover:text-red-600"
                >
                  <Flag size={12} aria-hidden /> Denunciar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {denuncia && (
        <div className="mt-3 bg-neutral-gray rounded-lg p-3">
          <p className="font-roboto text-sm text-soft-black mb-2">
            Denunciar avaliação de {denuncia.autor_nome ?? 'usuário'}
          </p>
          <select
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="w-full font-roboto text-sm rounded-lg border border-gray-200 p-2 mb-2"
            aria-label="Motivo da denúncia"
          >
            {Object.entries(ROTULOS_MOTIVO_DENUNCIA).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>{rotulo}</option>
            ))}
          </select>
          <textarea
            value={detalhes}
            onChange={(e) => setDetalhes(e.target.value)}
            maxLength={COMENTARIO_AVALIACAO_MAX}
            rows={2}
            placeholder="Detalhes (opcional)"
            className="w-full font-roboto text-sm rounded-lg border border-gray-200 p-2 mb-2 focus:outline-none focus:ring-2 focus:ring-green-deep"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={enviarDenuncia} loading={enviando}>Enviar denúncia</Button>
            <Button size="sm" variant="outline" onClick={() => setDenuncia(null)} disabled={enviando}>Voltar</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvaliacoesPerfil;
