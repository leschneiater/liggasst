import React from 'react';
import { FileText } from 'lucide-react';

const ContratosProfissional: React.FC = () => {
  return (
    <div className="min-h-screen bg-neutral-gray py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-poppins font-bold text-3xl text-soft-black mb-2">
            Meus Contratos
          </h1>
          <p className="font-roboto text-gray-600">
            Acompanhe seus contratos e serviços de SST
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-green-light rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText size={28} className="text-green-deep" />
          </div>
          <h2 className="font-poppins font-semibold text-xl text-soft-black mb-3">
            A gestão de contratos ainda não está disponível
          </h2>
          <p className="font-roboto text-gray-600 max-w-md mx-auto">
            Esta área está sendo preparada. Quando estiver ativa, seus contratos e serviços vão aparecer aqui, sempre com dados reais.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ContratosProfissional;
