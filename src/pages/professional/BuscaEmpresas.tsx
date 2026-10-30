import React from 'react';
import { Building2 } from 'lucide-react';

const BuscaEmpresas: React.FC = () => {
  return (
    <div className="min-h-screen bg-neutral-gray py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-poppins font-bold text-3xl text-soft-black mb-2">
            Buscar Empresas
          </h1>
          <p className="font-roboto text-gray-600">
            Encontre empresas que precisam dos seus serviços de SST
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-green-light rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 size={28} className="text-green-deep" />
          </div>
          <h2 className="font-poppins font-semibold text-xl text-soft-black mb-2">
            A busca de empresas ainda não está disponível
          </h2>
          <p className="font-roboto text-gray-600 max-w-md mx-auto">
            Esta área está sendo preparada. Quando estiver ativa, as empresas cadastradas vão aparecer aqui para você encontrar oportunidades.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BuscaEmpresas;
