import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Calendar,
  DollarSign,
  CheckCircle,
  ArrowLeft
} from 'lucide-react';
import Button from '../components/ui/Button';
import { getProfessionalPublic, ProfessionalSearchItem } from '../services/database';

const PerfilProfissionalPublico: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [professional, setProfessional] = useState<ProfessionalSearchItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activeTab, setActiveTab] = useState('sobre');

  const loadProfessional = async () => {
    if (!id) {
      setProfessional(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      const data = await getProfessionalPublic(id);
      setProfessional(data);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfessional();
  }, [id]);

  const handleGoBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-gray flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-deep"></div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-neutral-gray flex items-center justify-center">
        <div className="text-center">
          <h2 className="font-poppins font-bold text-2xl text-soft-black mb-2">
            Não foi possível carregar o perfil
          </h2>
          <p className="font-roboto text-gray-600 mb-6">
            Verifique sua conexão e tente novamente.
          </p>
          <Button onClick={loadProfessional}>
            Tentar novamente
          </Button>
        </div>
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
          <div className="flex items-start space-x-6">
            <div className="w-24 h-24 bg-green-light rounded-full flex items-center justify-center flex-shrink-0">
              <span className="font-poppins font-bold text-2xl text-green-deep">
                {professional.nome.split(' ').map(n => n[0]).join('')}
              </span>
            </div>

            <div>
              <h1 className="font-poppins font-bold text-3xl text-soft-black mb-2">
                {professional.nome}
              </h1>

              {professional.formacao && (
                <p className="font-roboto text-lg text-gray-600 mb-2">
                  {professional.formacao}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mb-3">
                {(professional.cidade || professional.estado) && (
                  <div className="flex items-center">
                    <MapPin size={16} className="mr-1" />
                    <span>{[professional.cidade, professional.estado].filter(Boolean).join(', ')}</span>
                  </div>
                )}
                {professional.experiencia !== null && (
                  <div className="flex items-center">
                    <Calendar size={16} className="mr-1" />
                    <span>{professional.experiencia} anos de experiência</span>
                  </div>
                )}
                {professional.raioAtendimento !== null && (
                  <div className="flex items-center">
                    <MapPin size={16} className="mr-1" />
                    <span>Atende até {professional.raioAtendimento}km</span>
                  </div>
                )}
              </div>

              {professional.valorHora !== null && (
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

        {/* Contato ainda não disponível — factual, sem promessa */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <p className="font-roboto text-sm text-gray-600">
            O contato com profissionais pela plataforma ainda não está disponível.
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-8">
              {[
                { id: 'sobre', label: 'Sobre' },
                { id: 'especializacoes', label: 'Especializações' }
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
                    {professional.descricao || 'Este profissional ainda não adicionou uma descrição.'}
                  </p>
                </div>

                {professional.disponibilidade.length > 0 && (
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
                )}
              </div>
            )}

            {/* Especializações */}
            {activeTab === 'especializacoes' && (
              <div>
                <h3 className="font-poppins font-semibold text-lg text-soft-black mb-4">
                  Áreas de Especialização
                </h3>
                {professional.especializacoes.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {professional.especializacoes.map((especializacao, index) => (
                      <div key={index} className="flex items-center p-4 bg-green-light bg-opacity-20 rounded-lg">
                        <CheckCircle size={20} className="text-green-medium mr-3" />
                        <span className="font-roboto text-gray-700">{especializacao}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-roboto text-gray-600">
                    Este profissional ainda não informou especializações.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerfilProfissionalPublico;
