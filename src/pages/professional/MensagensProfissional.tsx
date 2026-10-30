import React from 'react';
import ChatArea from '../../components/Mensagens/ChatArea';

const MensagensProfissional: React.FC = () => {
  return (
    <div className="min-h-screen bg-neutral-gray py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ChatArea subtitulo="Canal direto entre você e as empresas" />
      </div>
    </div>
  );
};

export default MensagensProfissional;
