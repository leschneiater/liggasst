import React, { useState } from 'react';
import { 
  Upload, 
  FileText, 
  Download, 
  Eye, 
  Trash2, 
  CheckCircle,
  AlertCircle,
  Clock,
  Plus
} from 'lucide-react';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';

interface Certificate {
  id: string;
  nome: string;
  tipo: string;
  dataUpload: string;
  dataValidade?: string;
  status: 'aprovado' | 'pendente' | 'rejeitado';
  arquivo: string;
  observacoes?: string;
}

const CertificadosProfissional: React.FC = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([
    {
      id: '1',
      nome: 'Certificado Técnico em Segurança do Trabalho',
      tipo: 'Formação',
      dataUpload: '2024-01-10',
      dataValidade: '2026-01-10',
      status: 'aprovado',
      arquivo: 'certificado-tst.pdf'
    },
    {
      id: '2',
      nome: 'Curso NR-35 - Trabalho em Altura',
      tipo: 'Capacitação',
      dataUpload: '2024-01-08',
      dataValidade: '2025-01-08',
      status: 'pendente',
      arquivo: 'nr35-certificado.pdf'
    }
  ]);

  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFiles = (files: FileList) => {
    Array.from(files).forEach(file => {
      if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
        // Simular upload
        toast.success(`Arquivo ${file.name} enviado com sucesso!`);
      } else {
        toast.error('Apenas arquivos PDF ou imagens são aceitos');
      }
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aprovado':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'pendente':
        return <Clock size={16} className="text-yellow-600" />;
      case 'rejeitado':
        return <AlertCircle size={16} className="text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'aprovado':
        return 'Aprovado';
      case 'pendente':
        return 'Em Análise';
      case 'rejeitado':
        return 'Rejeitado';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovado':
        return 'bg-green-100 text-green-800';
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejeitado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-neutral-gray py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-poppins font-bold text-3xl text-soft-black mb-2">
            Meus Certificados
          </h1>
          <p className="font-roboto text-gray-600">
            Mantenha seus certificados e documentos sempre atualizados
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Area */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="font-poppins font-semibold text-lg text-soft-black mb-4">
                Enviar Documento
              </h2>

              {/* Drag and Drop Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive 
                    ? 'border-green-medium bg-green-light bg-opacity-10' 
                    : 'border-gray-300 hover:border-green-light'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="font-roboto text-gray-600 mb-2">
                  Arraste arquivos aqui ou
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  icon={Plus}
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  Selecionar Arquivos
                </Button>
                <input
                  id="file-input"
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => e.target.files && handleFiles(e.target.files)}
                />
                <p className="font-roboto text-xs text-gray-500 mt-3">
                  PDF, JPG ou PNG até 10MB
                </p>
              </div>

              {/* Upload Guidelines */}
              <div className="mt-6 p-4 bg-green-light bg-opacity-20 rounded-lg">
                <h3 className="font-poppins font-semibold text-sm text-green-deep mb-2">
                  Documentos Recomendados:
                </h3>
                <ul className="font-roboto text-xs text-green-deep space-y-1">
                  <li>• Certificado de formação</li>
                  <li>• Registro profissional (CREA, CRT)</li>
                  <li>• Certificados de cursos NR</li>
                  <li>• Comprovantes de experiência</li>
                  <li>• Certificações especializadas</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Certificates List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="font-poppins font-semibold text-lg text-soft-black">
                    Documentos Enviados
                  </h2>
                  <span className="font-roboto text-sm text-gray-600">
                    {certificates.length} documento(s)
                  </span>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {certificates.map((cert) => (
                  <div key={cert.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 bg-green-light rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText size={20} className="text-green-deep" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-poppins font-medium text-soft-black mb-1">
                            {cert.nome}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className="font-roboto">{cert.tipo}</span>
                            <span className="font-roboto">
                              Enviado em {new Date(cert.dataUpload).toLocaleDateString('pt-BR')}
                            </span>
                            {cert.dataValidade && (
                              <span className="font-roboto">
                                Válido até {new Date(cert.dataValidade).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                          </div>
                          {cert.observacoes && (
                            <p className="font-roboto text-xs text-gray-500 mt-2">
                              {cert.observacoes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-roboto ${getStatusColor(cert.status)}`}>
                          {getStatusIcon(cert.status)}
                          <span className="ml-1">{getStatusText(cert.status)}</span>
                        </span>

                        <div className="flex items-center space-x-1">
                          <button
                            className="p-2 text-gray-400 hover:text-green-deep transition-colors"
                            title="Visualizar"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            className="p-2 text-gray-400 hover:text-green-deep transition-colors"
                            title="Download"
                          >
                            <Download size={16} />
                          </button>
                          <button
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {certificates.length === 0 && (
                  <div className="p-12 text-center">
                    <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                    <h3 className="font-poppins font-medium text-gray-900 mb-2">
                      Nenhum documento enviado
                    </h3>
                    <p className="font-roboto text-gray-600">
                      Envie seus certificados para aumentar suas chances de contratação
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Tips */}
            <div className="mt-6 bg-blue-50 p-6 rounded-xl">
              <h3 className="font-poppins font-semibold text-blue-800 mb-3">
                Dicas para Aprovação Rápida:
              </h3>
              <ul className="font-roboto text-sm text-blue-700 space-y-2">
                <li>• Envie documentos em boa qualidade (legíveis)</li>
                <li>• Certifique-se de que as datas estão visíveis</li>
                <li>• Mantenha certificados dentro da validade</li>
                <li>• Use nomes descritivos para os arquivos</li>
                <li>• Documentos em PDF são preferíveis</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificadosProfissional;