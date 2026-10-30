import React, { useEffect, useRef, useState } from 'react';
import { Award, Upload, FileText, Calendar, Building2, Eye, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';
import { uploadFile } from '../../services/api';
import {
  Certificate,
  fetchMyCertificates,
  createCertificate,
  getCertificateSignedUrl,
  setCertificateVisibility,
  deleteCertificate,
} from '../../services/database';

const TIPOS_PERMITIDOS = ['application/pdf', 'image/jpeg', 'image/png'];
const TAMANHO_MAXIMO = 10 * 1024 * 1024;

const rotuloStatus = (status: Certificate['status']): string => {
  switch (status) {
    case 'approved': return 'Aprovado';
    case 'rejected': return 'Rejeitado';
    case 'expired': return 'Vencido';
    default: return 'Enviado';
  }
};

const classeStatus = (status: Certificate['status']): string => {
  switch (status) {
    case 'approved': return 'bg-green-light text-green-deep';
    case 'rejected': return 'bg-red-100 text-red-700';
    case 'expired': return 'bg-amber-100 text-amber-800';
    default: return 'bg-gray-100 text-gray-600';
  }
};

const formatarData = (iso: string): string =>
  new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR');

const CertificadosProfissional: React.FC = () => {
  const [certificados, setCertificados] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [abrindoId, setAbrindoId] = useState<string | null>(null);
  const [alternandoId, setAlternandoId] = useState<string | null>(null);
  const [confirmandoExclusaoId, setConfirmandoExclusaoId] = useState<string | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  const [nome, setNome] = useState('');
  const [emissor, setEmissor] = useState('');
  const [emitidoEm, setEmitidoEm] = useState('');
  const [validoAte, setValidoAte] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [mostrarNoPerfil, setMostrarNoPerfil] = useState(false);
  const inputArquivoRef = useRef<HTMLInputElement>(null);

  const carregar = async () => {
    setLoading(true);
    setError(false);
    const resultado = await fetchMyCertificates();
    if (!resultado.success || !Array.isArray(resultado.data)) {
      setError(true);
      setLoading(false);
      return;
    }
    setCertificados(resultado.data as Certificate[]);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const selecionarArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setArquivo(null);
      return;
    }
    if (!TIPOS_PERMITIDOS.includes(file.type)) {
      toast.error('Formato não permitido. Envie PDF, JPG ou PNG.');
      e.target.value = '';
      setArquivo(null);
      return;
    }
    if (file.size > TAMANHO_MAXIMO) {
      toast.error('O arquivo deve ter no máximo 10 MB.');
      e.target.value = '';
      setArquivo(null);
      return;
    }
    setArquivo(file);
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error('Informe o nome do certificado.');
      return;
    }
    if (!arquivo) {
      toast.error('Selecione o arquivo do certificado.');
      return;
    }
    setEnviando(true);
    try {
      const upload = await uploadFile(arquivo, 'documents', 'certificados');
      if (!upload.success || !upload.filePath) throw upload.error ?? new Error('Falha no envio do arquivo.');

      const registro = await createCertificate({
        name: nome.trim(),
        issuer: emissor.trim() || null,
        issued_at: emitidoEm || null,
        expires_at: validoAte || null,
        storage_path: upload.filePath,
        visible_to_companies: mostrarNoPerfil,
      });
      if (!registro.success) {
        // rollback: remove o arquivo enviado para nao deixar objeto orfao no storage
        await supabase.storage.from('documents').remove([upload.filePath]);
        throw registro.error ?? new Error('Falha ao registrar o certificado.');
      }

      toast.success('Certificado enviado.');
      setNome('');
      setEmissor('');
      setEmitidoEm('');
      setValidoAte('');
      setArquivo(null);
      setMostrarNoPerfil(false);
      if (inputArquivoRef.current) inputArquivoRef.current.value = '';
      await carregar();
    } catch (err) {
      console.error('Erro ao enviar certificado:', err);
      toast.error('Não foi possível enviar o certificado. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  const alternarVisibilidade = async (c: Certificate) => {
    const novoValor = !c.visible_to_companies;
    setAlternandoId(c.id);
    setCertificados(prev => prev.map(item =>
      item.id === c.id ? { ...item, visible_to_companies: novoValor } : item
    ));
    const resultado = await setCertificateVisibility(c.id, novoValor);
    setAlternandoId(null);
    if (!resultado.success) {
      setCertificados(prev => prev.map(item =>
        item.id === c.id ? { ...item, visible_to_companies: c.visible_to_companies } : item
      ));
      toast.error('Não foi possível alterar a visibilidade. Tente novamente.');
    }
  };

  // Depende da policy certificates_delete (rascunho não aplicado); sem ela a
  // exclusão falha com erro genérico e a lista permanece intacta.
  const excluir = async (c: Certificate) => {
    setExcluindoId(c.id);
    const resultado = await deleteCertificate(c.id, c.storage_path);
    setExcluindoId(null);
    setConfirmandoExclusaoId(null);
    if (!resultado.success) {
      toast.error('Não foi possível excluir o certificado. Tente novamente.');
      return;
    }
    setCertificados(prev => prev.filter(item => item.id !== c.id));
    if (resultado.warning === 'storage') {
      toast('Certificado excluído; o arquivo pode ter ficado no armazenamento.', { icon: '⚠️' });
    } else {
      toast.success('Certificado excluído.');
    }
  };

  const verArquivo = async (c: Certificate) => {
    // janela aberta no gesto do usuario para nao ser bloqueada como popup;
    // a URL assinada e atribuida quando chega
    const janela = window.open('', '_blank', 'noopener,noreferrer');
    setAbrindoId(c.id);
    const resultado = await getCertificateSignedUrl(c.storage_path);
    setAbrindoId(null);
    if (!resultado.success || !resultado.signedUrl) {
      janela?.close();
      toast.error('Não foi possível abrir o arquivo. Tente novamente.');
      return;
    }
    if (janela) janela.location.href = resultado.signedUrl;
  };

  return (
    <div className="min-h-screen bg-neutral-gray py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-poppins font-bold text-3xl text-soft-black mb-2">
            Meus Certificados
          </h1>
          <p className="font-roboto text-gray-600">
            Envie e gerencie seus certificados e documentos de SST. Você escolhe quais aparecem no seu perfil para empresas cadastradas.
          </p>
        </div>

        {/* Formulário de envio */}
        <form onSubmit={enviar} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="font-poppins font-semibold text-xl text-soft-black mb-4">
            Enviar novo certificado
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input
              label="Nome do certificado"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex.: NR-35 Trabalho em Altura"
              required
            />
            <Input
              label="Emissor (opcional)"
              value={emissor}
              onChange={e => setEmissor(e.target.value)}
              placeholder="Ex.: Instituto de Treinamento"
            />
            <Input
              label="Data de emissão (opcional)"
              type="date"
              value={emitidoEm}
              onChange={e => setEmitidoEm(e.target.value)}
            />
            <Input
              label="Validade (opcional)"
              type="date"
              value={validoAte}
              onChange={e => setValidoAte(e.target.value)}
            />
          </div>
          <div className="mb-4">
            <label htmlFor="arquivo-certificado" className="block font-roboto font-medium text-soft-black text-sm mb-1">
              Arquivo (PDF, JPG ou PNG, até 10 MB)
            </label>
            <input
              id="arquivo-certificado"
              ref={inputArquivoRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={selecionarArquivo}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg font-roboto text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-light file:text-green-deep file:font-roboto file:font-medium hover:file:bg-green-medium focus:outline-none focus:ring-2 focus:ring-green-deep"
            />
          </div>
          <label className="flex items-center gap-2 mb-4 font-roboto text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={mostrarNoPerfil}
              onChange={e => setMostrarNoPerfil(e.target.checked)}
              className="w-4 h-4 accent-green-deep"
            />
            Mostrar este certificado no meu perfil para empresas cadastradas
          </label>
          <Button type="submit" icon={Upload} loading={enviando} disabled={enviando}>
            {enviando ? 'Enviando...' : 'Enviar Certificado'}
          </Button>
        </form>

        {/* Lista */}
        {loading && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <p className="font-roboto text-gray-600">Carregando certificados...</p>
          </div>
        )}

        {error && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <p className="font-roboto text-gray-600 mb-2">Não foi possível carregar seus certificados.</p>
            <button onClick={carregar} className="text-green-deep font-roboto font-medium hover:underline">
              Tentar novamente
            </button>
          </div>
        )}

        {!loading && !error && certificados.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-green-light rounded-full flex items-center justify-center mx-auto mb-6">
              <Award size={28} className="text-green-deep" />
            </div>
            <h2 className="font-poppins font-semibold text-xl text-soft-black mb-3">
              Nenhum certificado enviado ainda
            </h2>
            <p className="font-roboto text-gray-600 max-w-md mx-auto">
              Use o formulário acima para enviar seu primeiro certificado.
            </p>
          </div>
        )}

        {!loading && !error && certificados.length > 0 && (
          <div className="space-y-4">
            {certificados.map(c => (
              <div key={c.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="font-poppins font-semibold text-lg text-soft-black">{c.name}</h2>
                      <span className={`font-roboto text-xs font-medium px-2 py-1 rounded-full ${classeStatus(c.status)}`}>
                        {rotuloStatus(c.status)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 font-roboto text-sm text-gray-500">
                      {c.issuer && (
                        <span className="flex items-center"><Building2 size={14} className="mr-1" />{c.issuer}</span>
                      )}
                      {c.issued_at && (
                        <span className="flex items-center"><Calendar size={14} className="mr-1" />Emitido em {formatarData(c.issued_at)}</span>
                      )}
                      {c.expires_at && (
                        <span className="flex items-center"><Calendar size={14} className="mr-1" />Válido até {formatarData(c.expires_at)}</span>
                      )}
                      <span className="flex items-center"><FileText size={14} className="mr-1" />Enviado em {new Date(c.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <label className="flex items-center gap-2 mt-3 font-roboto text-sm text-gray-600 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={c.visible_to_companies}
                        disabled={alternandoId === c.id}
                        onChange={() => alternarVisibilidade(c)}
                        className="w-4 h-4 accent-green-deep"
                      />
                      Mostrar no perfil para empresas
                    </label>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Eye}
                      loading={abrindoId === c.id}
                      onClick={() => verArquivo(c)}
                    >
                      Ver arquivo
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Trash2}
                      onClick={() => setConfirmandoExclusaoId(c.id)}
                    >
                      Excluir
                    </Button>
                  </div>
                </div>
                {confirmandoExclusaoId === c.id && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="font-roboto text-sm text-red-800">
                      Excluir "{c.name}" definitivamente? O registro e o arquivo serão removidos.
                    </p>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        loading={excluindoId === c.id}
                        onClick={() => excluir(c)}
                        className="!bg-red-600 !border-red-600 hover:!bg-red-700"
                      >
                        Confirmar exclusão
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmandoExclusaoId(null)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CertificadosProfissional;
