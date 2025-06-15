import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User, 
  MapPin, 
  Award, 
  Star,
  Calendar,
  DollarSign,
  MessageSquare,
  CheckCircle,
  Clock,
  Phone,
  Mail,
  FileText,
  Download,
  Shield,
  ArrowLeft
} from 'lucide-react';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

interface Professional {
  id: string;
  nome: string;
  formacao: string;
  cidade: string;
  estado: string;
  experiencia: number;
  avaliacao: number;
  totalAvaliacoes: number;
  valorHora?: number;
  raioAtendimento: number;
  especializacoes: string[];
  disponibilidade: string[];
  descricao: string;
  verificado: boolean;
  registro: string;
  telefone: string;
  email: string;
  certificados: string[];
  projetos: number;
  clientesSatisfeitos: number;
}

interface Review {
  id: string;
  empresa: string;
  avaliacao: number;
  comentario: string;
  data: string;
  servico: string;
}

const PerfilProfissionalPublico: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sobre');

  // Mock data baseado no ID - dados fixos para demonstração
  const mockProfessionals: { [key: string]: Professional } = {
    '1': {
      id: '1',
      nome: 'João Silva',
      formacao: 'Técnico em Segurança do Trabalho',
      cidade: 'São Paulo',
      estado: 'SP',
      experiencia: 8,
      avaliacao: 4.9,
      totalAvaliacoes: 47,
      valorHora: 85,
      raioAtendimento: 50,
      especializacoes: ['PCMSO', 'PGR', 'NR-35', 'Treinamentos NR', 'CIPA'],
      disponibilidade: ['Manhã', 'Tarde'],
      descricao: 'Profissional experiente com foco em indústrias e construção civil. Especialista em elaboração de programas de segurança e treinamentos técnicos. Atuo há mais de 8 anos no mercado, sempre priorizando a excelência e a segurança dos trabalhadores.',
      verificado: true,
      registro: 'CRT-SP 123456',
      telefone: '(11) 99999-9999',
      email: 'joao.silva@email.com',
      certificados: ['NR-35', 'NR-33', 'NR-10', 'PCMSO', 'PGR'],
      projetos: 156,
      clientesSatisfeitos: 98
    },
    '2': {
      id: '2',
      nome: 'Maria Santos',
      formacao: 'Engenheira de Segurança do Trabalho',
      cidade: 'Rio de Janeiro',
      estado: 'RJ',
      experiencia: 12,
      avaliacao: 4.8,
      totalAvaliacoes: 63,
      valorHora: 120,
      raioAtendimento: 30,
      especializacoes: ['LTCAT', 'Perícia Técnica', 'Consultoria SST', 'PGR', 'PCMSO'],
      disponibilidade: ['Manhã', 'Tarde', 'Noite'],
      descricao: 'Especialista em laudos técnicos e consultoria para grandes empresas. Mais de 12 anos de experiência em projetos complexos de SST.',
      verificado: true,
      registro: 'CREA-RJ 987654',
      telefone: '(21) 98888-8888',
      email: 'maria.santos@email.com',
      certificados: ['LTCAT', 'Perícia Técnica', 'PGR', 'PCMSO', 'NR-18'],
      projetos: 203,
      clientesSatisfeitos: 96
    },
    '3': {
      id: '3',
      nome: 'Carlos Oliveira',
      formacao: 'Técnico em Segurança do Trabalho',
      cidade: 'Belo Horizonte',
      estado: 'MG',
      experiencia: 5,
      avaliacao: 4.7,
      totalAvaliacoes: 28,
      valorHora: 70,
      raioAtendimento: 40,
      especializacoes: ['Treinamentos NR', 'CIPA', 'Auditoria', 'PGR'],
      disponibilidade: ['Tarde', 'Noite'],
      descricao: 'Focado em treinamentos e desenvolvimento de equipes de segurança. Especialista em capacitação e formação de CIPAs.',
      verificado: false,
      registro: 'CRT-MG 456789',
      telefone: '(31) 97777-7777',
      email: 'carlos.oliveira@email.com',
      certificados: ['CIPA', 'NR-05', 'NR-06', 'Treinamentos'],
      projetos: 89,
      clientesSatisfeitos: 94
    }
  };

  const mockReviews: { [key: string]: Review[] } = {
    '1': [
      {
        id: '1',
        empresa: 'TechCorp Ltda',
        avaliacao: 5,
        comentario: 'Excelente profissional! Muito competente e pontual. O PCMSO foi elaborado com muita qualidade.',
        data: '2024-01-10',
        servico: 'PCMSO'
      },
      {
        id: '2',
        empresa: 'Indústria Moderna',
        avaliacao: 5,
        comentario: 'Trabalho impecável no PGR. Profissional muito técnico e detalhista.',
        data: '2023-12-15',
        servico: 'PGR'
      },
      {
        id: '3',
        empresa: 'Construtech',
        avaliacao: 4,
        comentario: 'Ótimo treinamento de NR-35. Equipe ficou muito bem preparada.',
        data: '2023-11-20',
        servico: 'Treinamento NR-35'
      }
    ],
    '2': [
      {
        id: '1',
        empresa: 'Petroquímica Brasil',
        avaliacao: 5,
        comentario: 'Excelente LTCAT. Muito detalhado e preciso.',
        data: '2024-01-05',
        servico: 'LTCAT'
      },
      {
        id: '2',
        empresa: 'Mineração Sul',
        avaliacao: 5,
        comentario: 'Consultoria excepcional. Ajudou muito nossa empresa.',
        data: '2023-12-20',
        servico: 'Consultoria SST'
      }
    ],
    '3': [
      {
        id: '1',
        empresa: 'Fábrica ABC',
        avaliacao: 5,
        comentario: 'Treinamento muito didático e prático.',
        data: '2024-01-12',
        servico: 'Treinamento CIPA'
      }
    ]
  };

  useEffect(() => {
    const loadProfessional = async () => {
      setLoading(true);
      try {
        // Simular delay de carregamento
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (id && mockProfessionals[id]) {
          setProfessional(mockProfessionals[id]);
          setReviews(mockReviews[id] || []);
        } else {
          setProfessional(null);
          setReviews([]);
        }
      } catch (error) {
        toast.error('Erro ao carregar perfil do profissional');
        setProfessional(null);
      } finally {
        setLoading(false);
      }
    };

    loadProfessional();
  }, [id]);

  const handleContact = () => {
    toast.success('Redirecionando para contato...');
    // Aqui você implementaria o sistema de mensagens
  };

  const handleHire = () => {
    toast.success('Redirecionando para contratação...');
    // Aqui você implementaria o sistema de contratação
  };

  const handleGoBack = () => {
    navigate(-1); // Volta para a página anterior
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-gray flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-deep"></div>
      </div>
    );
  }

  if (!professional) {
    return (
      <div className="min-h-screen bg-neutral-gray flex items-center justify-center">
        <div className="text-center">
          <h2 className="font-poppins font-bold text-2xl text-soft-black mb-2">
            Profissional não encontrado
          </h2>
          <p className="font-roboto text-gray-600 mb-6">
            O perfil que você está procurando não existe ou foi removido.
          </p>
          <Button onClick={handleGoBack} icon={ArrowLeft}>
            Voltar à Busca
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-gray py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <div className="mb-6">
          <Button 
            onClick={handleGoBack}
            variant="outline" 
            icon={ArrowLeft}
            size="sm"
          >
            Voltar à Busca
          </Button>
        </div>

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between">
            <div className="flex items-start space-x-6 mb-6 lg:mb-0">
              <div className="w-24 h-24 bg-green-light rounded-full flex items-center justify-center flex-shrink-0">
                <span className="font-poppins font-bold text-2xl text-green-deep">
                  {professional.nome.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="font-poppins font-bold text-3xl text-soft-black">
                    {professional.nome}
                  </h1>
                  {professional.verificado && (
                    <div className="flex items-center space-x-1 bg-green-light px-2 py-1 rounded-full">
                      <Shield size={16} className="text-green-deep" />
                      <span className="font-roboto text-xs text-green-deep font-medium">Verificado</span>
                    </div>
                  )}
                </div>
                
                <p className="font-roboto text-lg text-gray-600 mb-2">
                  {professional.formacao}
                </p>
                
                <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                  <div className="flex items-center">
                    <MapPin size={16} className="mr-1" />
                    <span>{professional.cidade}, {professional.estado}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar size={16} className="mr-1" />
                    <span>{professional.experiencia} anos de experiência</span>
                  </div>
                  <div className="flex items-center">
                    <Award size={16} className="mr-1" />
                    <span>{professional.registro}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <Star size={18} className="text-yellow-400 fill-current" />
                    <span className="font-roboto font-semibold text-gray-900">
                      {professional.avaliacao}
                    </span>
                    <span className="font-roboto text-sm text-gray-500">
                      ({professional.totalAvaliacoes} avaliações)
                    </span>
                  </div>
                  {professional.valorHora && (
                    <div className="flex items-center text-green-deep">
                      <DollarSign size={16} className="mr-1" />
                      <span className="font-roboto font-semibold">
                        R$ {professional.valorHora}/h
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex flex-col space-y-3 w-full lg:w-auto">
              <Button onClick={handleContact} icon={MessageSquare} size="lg" className="w-full lg:w-auto">
                Entrar em Contato
              </Button>
              <Button onClick={handleHire} variant="outline" size="lg" className="w-full lg:w-auto">
                Contratar Agora
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <FileText size={24} className="text-blue-600" />
            </div>
            <p className="font-poppins font-bold text-2xl text-soft-black">
              {professional.projetos}
            </p>
            <p className="font-roboto text-sm text-gray-600">Projetos Concluídos</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <CheckCircle size={24} className="text-green-600" />
            </div>
            <p className="font-poppins font-bold text-2xl text-soft-black">
              {professional.clientesSatisfeitos}%
            </p>
            <p className="font-roboto text-sm text-gray-600">Clientes Satisfeitos</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Clock size={24} className="text-yellow-600" />
            </div>
            <p className="font-poppins font-bold text-2xl text-soft-black">
              {professional.raioAtendimento}km
            </p>
            <p className="font-roboto text-sm text-gray-600">Raio de Atendimento</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-8">
              {[
                { id: 'sobre', label: 'Sobre' },
                { id: 'especializacoes', label: 'Especializações' },
                { id: 'avaliacoes', label: 'Avaliações' },
                { id: 'contato', label: 'Contato' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-roboto font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-green-deep text-green-deep'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-8">
            {/* Sobre */}
            {activeTab === 'sobre' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-poppins font-semibold text-lg text-soft-black mb-3">
                    Sobre o Profissional
                  </h3>
                  <p className="font-roboto text-gray-700 leading-relaxed">
                    {professional.descricao}
                  </p>
                </div>

                <div>
                  <h3 className="font-poppins font-semibold text-lg text-soft-black mb-3">
                    Disponibilidade
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {professional.disponibilidade.map((horario, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full font-roboto"
                      >
                        {horario}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-poppins font-semibold text-lg text-soft-black mb-3">
                    Certificados
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {professional.certificados.map((certificado, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-neutral-gray rounded-lg">
                        <span className="font-roboto text-sm text-gray-700">{certificado}</span>
                        <Download size={16} className="text-gray-400 hover:text-green-deep cursor-pointer" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Especializações */}
            {activeTab === 'especializacoes' && (
              <div>
                <h3 className="font-poppins font-semibold text-lg text-soft-black mb-4">
                  Áreas de Especialização
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {professional.especializacoes.map((especializacao, index) => (
                    <div key={index} className="flex items-center p-4 bg-green-light bg-opacity-20 rounded-lg">
                      <CheckCircle size={20} className="text-green-medium mr-3" />
                      <span className="font-roboto text-gray-700">{especializacao}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Avaliações */}
            {activeTab === 'avaliacoes' && (
              <div>
                <h3 className="font-poppins font-semibold text-lg text-soft-black mb-4">
                  Avaliações dos Clientes
                </h3>
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-poppins font-medium text-soft-black">
                            {review.empresa}
                          </h4>
                          <p className="font-roboto text-sm text-gray-600">
                            {review.servico} • {new Date(review.data).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={16}
                              className={`${
                                i < review.avaliacao
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="font-roboto text-gray-700">
                        {review.comentario}
                      </p>
                    </div>
                  ))}
                  
                  {reviews.length === 0 && (
                    <div className="text-center py-8">
                      <p className="font-roboto text-gray-600">
                        Ainda não há avaliações para este profissional.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Contato */}
            {activeTab === 'contato' && (
              <div>
                <h3 className="font-poppins font-semibold text-lg text-soft-black mb-4">
                  Informações de Contato
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <Phone size={20} className="text-gray-400 mr-3" />
                      <span className="font-roboto text-gray-700">{professional.telefone}</span>
                    </div>
                    <div className="flex items-center">
                      <Mail size={20} className="text-gray-400 mr-3" />
                      <span className="font-roboto text-gray-700">{professional.email}</span>
                    </div>
                    <div className="flex items-center">
                      <MapPin size={20} className="text-gray-400 mr-3" />
                      <span className="font-roboto text-gray-700">
                        {professional.cidade}, {professional.estado}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-green-light bg-opacity-20 p-4 rounded-lg">
                    <h4 className="font-poppins font-semibold text-green-deep mb-2">
                      Como entrar em contato:
                    </h4>
                    <ul className="font-roboto text-sm text-green-deep space-y-1">
                      <li>• Use o botão "Entrar em Contato" para enviar uma mensagem</li>
                      <li>• Descreva seu projeto em detalhes</li>
                      <li>• Aguarde a resposta do profissional</li>
                      <li>• Negocie prazos e valores diretamente</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerfilProfissionalPublico;