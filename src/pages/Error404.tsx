import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Search, ArrowLeft, Mail, Phone } from 'lucide-react';
import Button from '../components/ui/Button';

const Error404: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-deep via-green-medium to-green-light flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="text-8xl font-bold text-white mb-4 animate-bounce-soft">404</div>
          <h1 className="font-poppins font-bold text-3xl text-white mb-4">
            Página não encontrada
          </h1>
          <p className="font-roboto text-green-light text-lg">
            A página que você está procurando não existe ou foi movida.
          </p>
        </div>

        <div className="space-y-4">
          <Button
            as={Link}
            to="/"
            size="lg"
            icon={Home}
            className="bg-green-light text-green-deep hover:bg-white hover:text-green-deep w-full"
          >
            Voltar ao Início
          </Button>
          
          <Button
            as={Link}
            to="/busca-profissionais"
            variant="outline"
            size="lg"
            icon={Search}
            className="border-white text-white hover:bg-white hover:text-green-deep w-full"
          >
            Buscar Profissionais
          </Button>
          
          <button
            onClick={() => window.history.back()}
            className="flex items-center justify-center w-full px-6 py-3 text-green-light hover:text-white transition-colors duration-200 font-roboto font-medium"
          >
            <ArrowLeft size={16} className="mr-2" />
            Voltar à Página Anterior
          </button>
        </div>

        <div className="mt-12 text-white">
          <p className="font-roboto text-sm mb-2">
            Precisa de ajuda? Entre em contato conosco:
          </p>
          <div className="space-y-1">
            <div className="flex items-center justify-center space-x-2">
              <Mail size={16} />
              <span className="font-roboto text-sm">suporte@liggasst.com.br</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <Phone size={16} />
              <span className="font-roboto text-sm">(11) 99999-9999</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Error404;