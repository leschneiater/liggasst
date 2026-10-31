import React, { useCallback, useEffect, useState } from 'react';
import ListaContratos from '../../components/contratos/ListaContratos';
import AvaliacoesRecebidas from '../../components/avaliacoes/AvaliacoesRecebidas';
import { AvaliacaoPendente, AvaliacaoRow } from '../../components/contratos/avaliacaoGestao';
import { ContratoRow } from './contratoGestao';
import { avaliacoesPendentes, listarContratos, minhasAvaliacoes } from '../../services/database';

const ContratosEmpresa: React.FC = () => {
  const [contratos, setContratos] = useState<ContratoRow[]>([]);
  const [pendentes, setPendentes] = useState<AvaliacaoPendente[]>([]);
  const [minhas, setMinhas] = useState<AvaliacaoRow[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  const carregar = useCallback(() => {
    setCarregando(true);
    setErro(false);
    Promise.all([listarContratos(), avaliacoesPendentes(), minhasAvaliacoes()])
      .then(([c, p, m]) => {
        setContratos(c);
        setPendentes(p);
        setMinhas(m);
      })
      .catch((e) => {
        console.error('Erro ao carregar contratos:', e);
        setErro(true);
      })
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return (
    <div className="min-h-screen bg-neutral-gray py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="font-poppins font-bold text-3xl text-soft-black mb-2">
            Contratos
          </h1>
          <p className="font-roboto text-gray-600">
            Acompanhe as propostas e os serviços de SST contratados pela sua empresa. O pagamento é combinado diretamente com o profissional; a plataforma não processa pagamentos.
          </p>
        </div>

        {erro ? (
          <p className="font-roboto text-gray-600">
            Não foi possível carregar os contratos. Tente novamente em instantes.
          </p>
        ) : (
          <>
            <ListaContratos
              papel="empresa"
              contratos={contratos}
              carregando={carregando}
              onAtualizar={carregar}
              avaliacoes={{ pendentes, minhas }}
            />
            <AvaliacoesRecebidas recebidas={minhas.filter((a) => a.direcao === 'recebida')} />
          </>
        )}
      </div>
    </div>
  );
};

export default ContratosEmpresa;
