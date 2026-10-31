import React, { useCallback, useEffect, useState } from 'react';
import ListaContratos from '../../components/contratos/ListaContratos';
import { ContratoRow } from '../company/contratoGestao';
import { listarContratos } from '../../services/database';

const ContratosProfissional: React.FC = () => {
  const [contratos, setContratos] = useState<ContratoRow[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  const carregar = useCallback(() => {
    setCarregando(true);
    setErro(false);
    listarContratos()
      .then(setContratos)
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
            Meus Contratos
          </h1>
          <p className="font-roboto text-gray-600">
            Responda às propostas das empresas e acompanhe seus serviços de SST. O pagamento é combinado diretamente com a empresa; a plataforma não processa pagamentos.
          </p>
        </div>

        {erro ? (
          <p className="font-roboto text-gray-600">
            Não foi possível carregar os contratos. Tente novamente em instantes.
          </p>
        ) : (
          <ListaContratos
            papel="profissional"
            contratos={contratos}
            carregando={carregando}
            onAtualizar={carregar}
          />
        )}
      </div>
    </div>
  );
};

export default ContratosProfissional;
