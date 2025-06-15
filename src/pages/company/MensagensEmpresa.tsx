import React, { useState } from 'react';
import { 
  MessageSquare, 
  Send, 
  Search, 
  User,
  Clock,
  Paperclip,
  MoreVertical
} from 'lucide-react';
import Button from '../../components/ui/Button';

interface Message {
  id: string;
  sender: 'me' | 'professional';
  content: string;
  timestamp: string;
  read: boolean;
}

interface Conversation {
  id: string;
  professional: string;
  specialty: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  messages: Message[];
}

const MensagensEmpresa: React.FC = () => {
  const [conversations] = useState<Conversation[]>([
    {
      id: '1',
      professional: 'João Silva',
      specialty: 'Técnico em Segurança do Trabalho',
      lastMessage: 'Posso agendar a visita para quinta-feira às 14h.',
      timestamp: '2024-01-15T14:30:00Z',
      unread: 1,
      messages: [
        {
          id: '1',
          sender: 'me',
          content: 'Olá João! Gostaria de solicitar um orçamento para PCMSO.',
          timestamp: '2024-01-15T10:00:00Z',
          read: true
        },
        {
          id: '2',
          sender: 'professional',
          content: 'Olá! Claro, posso ajudar. Quantos funcionários a empresa possui?',
          timestamp: '2024-01-15T10:15:00Z',
          read: true
        },
        {
          id: '3',
          sender: 'me',
          content: 'Temos 150 funcionários. Quando você poderia fazer uma visita técnica?',
          timestamp: '2024-01-15T14:00:00Z',
          read: true
        },
        {
          id: '4',
          sender: 'professional',
          content: 'Posso agendar a visita para quinta-feira às 14h.',
          timestamp: '2024-01-15T14:30:00Z',
          read: false
        }
      ]
    },
    {
      id: '2',
      professional: 'Maria Santos',
      specialty: 'Engenheira de Segurança do Trabalho',
      lastMessage: 'Enviei a proposta por e-mail. Aguardo retorno.',
      timestamp: '2024-01-14T16:45:00Z',
      unread: 0,
      messages: [
        {
          id: '1',
          sender: 'me',
          content: 'Preciso de apoio para elaboração de PPRA.',
          timestamp: '2024-01-14T15:00:00Z',
          read: true
        },
        {
          id: '2',
          sender: 'professional',
          content: 'Posso ajudar! Vou preparar uma proposta detalhada.',
          timestamp: '2024-01-14T15:30:00Z',
          read: true
        },
        {
          id: '3',
          sender: 'professional',
          content: 'Enviei a proposta por e-mail. Aguardo retorno.',
          timestamp: '2024-01-14T16:45:00Z',
          read: true
        }
      ]
    }
  ]);

  const [selectedConversation, setSelectedConversation] = useState<string>('1');
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const currentConversation = conversations.find(c => c.id === selectedConversation);

  const filteredConversations = conversations.filter(conv =>
    conv.professional.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.specialty.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // Aqui você enviaria a mensagem
      console.log('Sending message:', newMessage);
      setNewMessage('');
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
  };

  return (
    <div className="min-h-screen bg-neutral-gray py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-poppins font-bold text-3xl text-soft-black mb-2">
            Mensagens
          </h1>
          <p className="font-roboto text-gray-600">
            Converse diretamente com os profissionais de SST
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 h-[600px]">
            {/* Conversations List */}
            <div className="lg:col-span-1 border-r border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar conversas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-deep focus:border-green-deep"
                  />
                </div>
              </div>

              <div className="overflow-y-auto h-full">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => setSelectedConversation(conversation.id)}
                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedConversation === conversation.id ? 'bg-green-light bg-opacity-20' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-green-light rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="font-poppins font-medium text-green-deep text-sm">
                          {conversation.professional.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-poppins font-medium text-soft-black truncate">
                            {conversation.professional}
                          </h3>
                          <span className="font-roboto text-xs text-gray-500">
                            {formatTime(conversation.timestamp)}
                          </span>
                        </div>
                        <p className="font-roboto text-xs text-gray-500 mb-1">
                          {conversation.specialty}
                        </p>
                        <p className="font-roboto text-sm text-gray-600 truncate">
                          {conversation.lastMessage}
                        </p>
                        {conversation.unread > 0 && (
                          <div className="flex justify-end mt-1">
                            <span className="bg-green-medium text-white text-xs rounded-full px-2 py-1">
                              {conversation.unread}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {filteredConversations.length === 0 && (
                  <div className="p-8 text-center">
                    <MessageSquare size={48} className="mx-auto mb-4 text-gray-300" />
                    <h3 className="font-poppins font-medium text-gray-900 mb-2">
                      Nenhuma conversa encontrada
                    </h3>
                    <p className="font-roboto text-gray-600 text-sm">
                      {searchTerm ? 'Tente ajustar o termo de busca' : 'Você ainda não possui mensagens'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div className="lg:col-span-2 flex flex-col">
              {currentConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-light rounded-full flex items-center justify-center">
                        <span className="font-poppins font-medium text-green-deep text-sm">
                          {currentConversation.professional.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-poppins font-semibold text-soft-black">
                          {currentConversation.professional}
                        </h3>
                        <p className="font-roboto text-sm text-gray-600">
                          {currentConversation.specialty}
                        </p>
                      </div>
                    </div>
                    <button className="p-2 text-gray-400 hover:text-gray-600">
                      <MoreVertical size={20} />
                    </button>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {currentConversation.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.sender === 'me'
                              ? 'bg-green-deep text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <p className="font-roboto text-sm">{message.content}</p>
                          <div className="flex items-center justify-end mt-1">
                            <Clock size={12} className={`mr-1 ${message.sender === 'me' ? 'text-green-light' : 'text-gray-500'}`} />
                            <span className={`font-roboto text-xs ${message.sender === 'me' ? 'text-green-light' : 'text-gray-500'}`}>
                              {formatTime(message.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-gray-200">
                    <div className="flex items-center space-x-3">
                      <button className="p-2 text-gray-400 hover:text-gray-600">
                        <Paperclip size={20} />
                      </button>
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Digite sua mensagem..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-deep focus:border-green-deep"
                        />
                      </div>
                      <Button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                        icon={Send}
                        size="sm"
                      >
                        Enviar
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare size={64} className="mx-auto mb-4 text-gray-300" />
                    <h3 className="font-poppins font-medium text-gray-900 mb-2">
                      Selecione uma conversa
                    </h3>
                    <p className="font-roboto text-gray-600">
                      Escolha uma conversa para começar a trocar mensagens
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MensagensEmpresa;