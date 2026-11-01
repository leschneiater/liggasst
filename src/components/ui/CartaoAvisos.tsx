import React from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAvisos } from '../../contexts/AvisosContext';
import { textoMensagensNovas, textoPropostasPendentes } from '../../utils/avisos';

// Resumo no painel. Some quando nao ha nada novo.
const CartaoAvisos: React.FC<{ rotaMensagens: string; rotaContratos: string; mensagensDisponivel: boolean }> = ({
  rotaMensagens, rotaContratos, mensagensDisponivel,
}) => {
  const { mensagensNovas, propostasPendentes } = useAvisos();
  const mostraMsg = mensagensDisponivel && mensagensNovas > 0;
  if (!mostraMsg && propostasPendentes <= 0) return null;
  return (
    <section aria-label="Avisos" className="mb-8 bg-white border border-green-light rounded-2xl p-5 shadow-sm">
      <h2 className="flex items-center gap-2 font-poppins font-semibold text-lg text-soft-black mb-3">
        <Bell size={18} aria-hidden="true" /> Novidades para você
      </h2>
      <ul className="space-y-2 font-roboto text-gray-700">
        {mostraMsg && (
          <li>
            <Link to={rotaMensagens} className="text-green-deep font-medium underline">
              {textoMensagensNovas(mensagensNovas)}
            </Link>
          </li>
        )}
        {propostasPendentes > 0 && (
          <li>
            <Link to={rotaContratos} className="text-green-deep font-medium underline">
              {textoPropostasPendentes(propostasPendentes)}
            </Link>
          </li>
        )}
      </ul>
    </section>
  );
};

export default CartaoAvisos;
