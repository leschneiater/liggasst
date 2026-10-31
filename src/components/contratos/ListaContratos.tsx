import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../ui/Button';
import {
  AcaoContrato,
  ContratoRow,
  PapelContrato,
  ROTULOS_ACAO_CONTRATO,
  ROTULOS_STATUS_CONTRATO,
  acoesDoContrato,
  formatarDataContrato,
  formatarMoedaContrato,
  separarContratos,
  textoConfirmacaoContrato,
  tituloDoContrato,
} from '../../pages/company/contratoGestao';
import { cancelarContrato, concluirContrato, responderContrato } from '../../services/database';

interface ListaContratosProps {
  papel: PapelContrato;
  contratos: ContratoRow[];
  carregando: boolean;
  onAtualizar: () => void;
}

const SECOES: { chave: 'pendentes' | 'emAndamento' | 'historico'; titulo: string }[] = [
  { chave: 'pendentes', titulo: 'Aguardando resposta' },
  { chave: 'emAndamento', titulo: 'Em andamento' },
  { chave: 'historico', titulo: 'Histórico' },
];

const ListaContratos: React.FC<ListaContratosProps> = ({ papel, contratos, carregando, onAtualizar }) => {
  const [confirmacao, setConfirmacao] = useState<{ id: string; acao: AcaoContrato } | null>(null);
  const [acaoLoading, setAcaoLoading] = useState(false);

  const executarAcao = async () => {
    if (!confirmacao) return;
    const { id, acao } = confirmacao;
    setAcaoLoading(true);
    try {
      if (acao === 'aceitar') await responderContrato(id, 'aceitar');
      else if (acao === 'recusar') await responderContrato(id, 'recusar');
      else if (acao === 'concluir') await concluirContrato(id);
      else await cancelarContrato(id);
      toast.success(
        acao === 'aceitar'
          ? 'Proposta aceita. O serviço está em andamento.'
          : acao === 'recusar'
            ? 'Proposta recusada. Ela ficou no seu histórico.'
            : acao === 'concluir'
              ? 'Contrato concluído. Ele ficou no seu histórico.'
              : 'Contrato cancelado. Ele ficou no histórico.'
      );
      setConfirmacao(null);
      onAtualizar();
    } catch (error) {
      console.error('Erro na ação do contrato:', error);
      // Conflito de concorrencia (ex.: a demanda ja nao estava ativa no
      // aceite) chega como erro da RPC; nada foi alterado no banco.
      const mensagem = error instanceof Error ? error.message : '';
      toast.error(
        mensagem.includes('nao esta mais ativa')
          ? 'Esta demanda não está mais ativa. Nada foi alterado; a lista foi atualizada.'
          : 'Não foi possível concluir a ação. Verifique o status atual antes de tentar de novo.'
      );
      setConfirmacao(null);
      onAtualizar();
    } finally {
      setAcaoLoading(false);
    }
  };

  if (carregando) {
    return <p className="font-roboto text-gray-500 text-sm">Carregando contratos...</p>;
  }

  if (contratos.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
        <div className="w-16 h-16 bg-green-light rounded-full flex items-center justify-center mx-auto mb-6">
          <FileText size={28} className="text-green-deep" />
        </div>
        <h2 className="font-poppins font-semibold text-xl text-soft-black mb-3">
          Nenhum contrato por aqui ainda
        </h2>
        <p className="font-roboto text-gray-600 max-w-md mx-auto mb-6">
          {papel === 'empresa'
            ? 'Quando você propor um contrato a um profissional, a tratativa aparece aqui, sem dados de exemplo.'
            : 'Quando uma empresa propor um contrato para você, a proposta aparece aqui, sem dados de exemplo.'}
        </p>
        <Button
          as={Link}
          to={papel === 'empresa' ? '/busca-profissionais-empresa' : '/demandas-disponiveis'}
          variant="outline"
          size="sm"
        >
          {papel === 'empresa' ? 'Buscar profissionais' : 'Ver demandas disponíveis'}
        </Button>
      </div>
    );
  }

  const grupos = separarContratos(contratos);

  const renderContrato = (contrato: ContratoRow) => {
    const acoes = acoesDoContrato(contrato.status, papel);
    const emAndamento = contrato.status === 'in_progress' || contrato.status === 'accepted';
    const valor = formatarMoedaContrato(contrato.amount);
    const inicio = formatarDataContrato(contrato.starts_at);
    const fim = formatarDataContrato(contrato.ends_at);
    return (
      <li key={contrato.id} className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-roboto font-medium text-soft-black">{tituloDoContrato(contrato)}</p>
            <p className="font-roboto text-sm text-gray-500">
              {papel === 'empresa' ? 'Profissional' : 'Empresa'}: {contrato.contraparte_nome ?? '—'}
            </p>
            {contrato.demanda_titulo && (
              <p className="font-roboto text-sm text-gray-500">
                Demanda: {contrato.demanda_titulo}
              </p>
            )}
            <p className="font-roboto text-sm text-gray-500">
              {[valor, inicio ? `Início ${inicio}` : null, fim ? `até ${fim}` : null]
                .filter(Boolean)
                .join(' • ')}
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="inline-block px-2 py-1 text-xs font-roboto rounded-full bg-green-light text-green-deep">
              {ROTULOS_STATUS_CONTRATO[contrato.status] ?? contrato.status}
            </span>
            <p className="font-roboto text-xs text-gray-400 mt-1">
              {new Date(contrato.created_at).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
        {acoes.length > 0 && confirmacao?.id !== contrato.id && (
          <div className="mt-2 flex flex-wrap gap-2">
            {acoes.map((acao) => (
              <Button
                key={acao}
                variant={acao === 'aceitar' || acao === 'concluir' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setConfirmacao({ id: contrato.id, acao })}
              >
                {ROTULOS_ACAO_CONTRATO[acao]}
              </Button>
            ))}
          </div>
        )}
        {confirmacao?.id === contrato.id && (
          <div className="mt-2 bg-neutral-gray rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-2">
            <p className="font-roboto text-sm text-soft-black flex-1">
              {textoConfirmacaoContrato(confirmacao.acao, {
                temDemanda: Boolean(contrato.demand_id),
                emAndamento,
              })}
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={executarAcao} loading={acaoLoading}>
                Confirmar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmacao(null)}
                disabled={acaoLoading}
              >
                Voltar
              </Button>
            </div>
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-6">
      {SECOES.map(({ chave, titulo }) => {
        const itens = grupos[chave];
        if (itens.length === 0) return null;
        return (
          <div key={chave} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="font-poppins font-semibold text-xl text-soft-black mb-2">{titulo}</h2>
            <ul className="divide-y divide-gray-100">{itens.map(renderContrato)}</ul>
          </div>
        );
      })}
    </div>
  );
};

export default ListaContratos;
