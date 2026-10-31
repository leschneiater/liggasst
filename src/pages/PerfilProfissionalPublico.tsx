import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Calendar,
  DollarSign,
  CheckCircle,
  ArrowLeft,
  MessageSquare,
  Award,
  Building2,
  Eye,
  FileText
} from 'lucide-react';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { useMessagingDisponivel } from '../hooks/useMessagingDisponivel';
import toast from 'react-hot-toast';
import { getProfessionalPublic, ProfessionalSearchItem, fetchSharedCertificates, getSharedCertificateUrl, SharedCertificate } from '../services/database';

const iniciaisNome = (nome: string): string => {
  const partes = nome.trim().split(/\s+/).filter(p => /[A-Za-zÀ-ÿ]/.test(p[0] ?? ''));
  if (partes.length === 0) return '?';
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
};

const PerfilProfissionalPublico: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [professional, setProfessional] = useState<ProfessionalSearchItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activeTab, setActiveTab] = useState('sobre');
  const { userType } = useAuth();
  const [certificados, setCertificados] = useState<SharedCertificate[] | null>(null);
  const [certificadosErro, setCertificadosErro] = useState(false);
  const [abrindoCertId, setAbrindoCertId] = useState<string | null>(null);
  const { disponivel: msgDisponivel } = useMessagingDisponivel();

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

  const carregarCertificados = async (professionalId: string) => {
    setCertificadosErro(false);
    const r = await fetchSharedCertificates(professionalId);
    if (r.success && Array.isArray(r.data)) {
      setCertificados(r.data as SharedCertificate[]);
    } else {
      setCertificadosErro(true);
    }
  };

  useEffect(() => {
    if (userType === 'company' && professional && certificados === null && !certificadosErro) {
      carregarCertificados(professional.id);
    }
  }, [userType, professional, certificados, certificadosErro]);

  const abrirCertificado = async (certificateId: string) => {
    // janela aberta no gesto do usuario para nao ser bloqueada como popup;
    // a URL assinada e atribuida quando chega
    const janela = window.open('', '_blank');
    // protecao reverse-tabnabbing: mantemos a referencia para atribuir a URL
    // assinada, mas a pagina de destino nao pode acessar window.opener
    if (janela) janela.opener = null;
    setAbrindoCertId(certificateId);
    const r = await getSharedCertificateUrl(certificateId);
    setAbrindoCertId(null);
    if (!r.success || !r.signedUrl) {
      janela?.close();
      toast.error('Não foi possível abrir o arquivo. O profissional pode ter removido o compartilhamento.');
      return;
    }
    if (janela) janela.location.href = r.signedUrl;
  };

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
        <div className="mb-6 flex items-center justify-between">
          <Button
            onClick={handleGoBack}
            variant="outline"
            icon={ArrowLeft}
            size="sm"
          >
            Voltar à Busca
          </Button>
          {userType === 'company' && professional && (
            <Button
              onClick={() => navigate(`/propor-contrato/${professional.id}`)}
              icon={FileText}
              size="sm"
            >
              Propor Contrato
            </Button>
          )}
          {userType === 'company' && professional && msgDisponivel && (
            <Button
              onClick={() => navigate(`/mensagens-empresa?para=${professional.id}`)}
              icon={MessageSquare}
              size="sm"
              variant="outline"
            >
              Enviar Mensagem
            </Button>
          )}
        </div>

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-8">
          <div className="flex items-start space-x-6">
            <div className="w-24 h-24 bg-green-light rounded-full flex items-center justify-center flex-shrink-0">
              <span className="font-poppins font-bold text-2xl text-green-deep">
                {iniciaisNome(professional.nome)}
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

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-8">
              {[
                { id: 'sobre', label: 'Sobre' },
                { id: 'especializacoes', label: 'Especializações' },
                ...(userType === 'company' ? [{ id: 'certificados', label: 'Certificados' }] : [])
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

            {/* Certificados (somente empresas) */}
            {activeTab === 'certificados' && userType === 'company' && (
              <div>
                <h3 className="font-poppins font-semibold text-lg text-soft-black mb-1">
                  Certificados
                </h3>
                <p className="font-roboto text-sm text-gray-500 mb-4">
                  Documentos que o profissional escolheu mostrar. O Ligga SST não verifica certificados.
                </p>
                {certificadosErro ? (
                  <div>
                    <p className="font-roboto text-gray-600 mb-2">Não foi possível carregar os certificados.</p>
                    <button
                      onClick={() => professional && carregarCertificados(professional.id)}
                      className="text-green-deep font-roboto font-medium hover:underline"
                    >
                      Tentar novamente
                    </button>
                  </div>
                ) : certificados === null ? (
                  <p className="font-roboto text-gray-600">Carregando certificados...</p>
                ) : certificados.length > 0 ? (
                  <div className="space-y-4">
                    {certificados.map((c) => (
                      <div key={c.id} className="flex items-start p-4 bg-green-light bg-opacity-20 rounded-lg">
                        <Award size={20} className="text-green-deep mr-3 mt-1 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <h4 className="font-poppins font-semibold text-soft-black">{c.name}</h4>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 font-roboto text-sm text-gray-500 mt-1">
                            {c.issuer && (
                              <span className="flex items-center"><Building2 size={14} className="mr-1" />{c.issuer}</span>
                            )}
                            {c.issued_at && (
                              <span className="flex items-center"><Calendar size={14} className="mr-1" />Emitido em {new Date(c.issued_at + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                            )}
                            {c.expires_at && (
                              <span className="flex items-center"><Calendar size={14} className="mr-1" />Válido até {new Date(c.expires_at + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={Eye}
                          loading={abrindoCertId === c.id}
                          onClick={() => abrirCertificado(c.id)}
                          className="flex-shrink-0"
                        >
                          Abrir arquivo
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-roboto text-gray-600">
                    Este profissional não compartilhou certificados.
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
