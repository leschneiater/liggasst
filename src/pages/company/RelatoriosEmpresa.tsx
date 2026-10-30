import React from 'react';
import { BarChart3 } from 'lucide-react';

const RelatoriosEmpresa: React.FC = () => {
  return (
    <div className="min-h-screen bg-neutral-gray py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-poppins font-bold text-3xl text-soft-black mb-2">
            Relatórios
          </h1>
          <p className="font-roboto text-gray-600">
            Acompanhe os resultados das suas demandas e contratações de SST
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-green-light rounded-full flex items-center justify-center mx-auto mb-6">
            <BarChart3 size={28} className="text-green-deep" />
          </div>
          <h2 className="font-poppins font-semibold text-xl text-soft-black mb-3">
            Os relatórios ainda não estão disponíveis
          </h2>
          <p className="font-roboto text-gray-600 max-w-md mx-auto">
            Esta área está sendo preparada. Quando estiver ativa, os relatórios das suas demandas e contratações vão aparecer aqui, sempre com dados reais da sua empresa.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RelatoriosEmpresa;
