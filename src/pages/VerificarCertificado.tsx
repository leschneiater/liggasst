// Etapa 5: verificacao publica do certificado pelo codigo (desde 05/11).
// Pagina aberta (sem login): qualquer pessoa confirma a autenticidade pelos
// campos que o proprio certificado imprime. A RPC nao devolve IDs internos.
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldCheck, ShieldX, Search } from 'lucide-react';
import { verificarCertificado, formatarCargaHoraria, type VerificacaoCertificado } from '../services/certificados';
import Button from '../components/ui/Button';

const VerificarCertificado: React.FC = () => {
  const { codigo: codigoRota } = useParams<{ codigo: string }>();
  const [codigo, setCodigo] = useState(codigoRota ?? '');
  const [resultado, setResultado] = useState<VerificacaoCertificado | null>(null);
  const [erro, setErro] = useState(false);
  const [buscando, setBuscando] = useState(false);

  const verificar = async (c: string) => {
    const limpo = c.trim();
    if (!limpo) return;
    setBuscando(true);
    setErro(false);
    setResultado(null);
    try {
      setResultado(await verificarCertificado(limpo));
    } catch {
      setErro(true);
    } finally {
      setBuscando(false);
    }
  };

  useEffect(() => {
    if (codigoRota) verificar(codigoRota);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigoRota]);

  return (
    <div className="min-h-screen bg-neutral-gray py-8">
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-3 mb-6">
          <ShieldCheck className="w-7 h-7 text-green-deep" aria-hidden="true" />
          <h1 className="font-poppins text-2xl font-bold text-gray-900">Verificar certificado</h1>
        </div>

        <p className="font-roboto text-gray-700 mb-4">
          Digite o código de autenticidade impresso no certificado (formato LST-XXXXXXXXXX).
        </p>

        <form
          onSubmit={(e) => { e.preventDefault(); verificar(codigo); }}
          className="flex items-stretch gap-2 mb-6"
        >
          <input
            type="text"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            placeholder="LST-XXXXXXXXXX"
            aria-label="Código de autenticidade do certificado"
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 font-roboto uppercase focus:outline-none focus:ring-2 focus:ring-green-deep"
          />
          <Button type="submit" variant="primary" icon={Search} disabled={buscando || !codigo.trim()}>
            {buscando ? 'Verificando...' : 'Verificar'}
          </Button>
        </form>

        {erro && (
          <p className="font-roboto text-red-600">Não foi possível verificar agora. Tente novamente.</p>
        )}

        {resultado && !resultado.valido && (
          <div className="bg-white rounded-lg shadow-sm border border-red-200 p-5 flex items-start space-x-3">
            <ShieldX className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-poppins font-semibold text-red-700">Certificado não encontrado</p>
              <p className="font-roboto text-sm text-gray-600 mt-1">
                Confira se o código foi digitado exatamente como aparece no certificado.
              </p>
            </div>
          </div>
        )}

        {resultado?.valido && (
          <div className="bg-white rounded-lg shadow-sm border-2 border-green-deep p-5">
            <div className="flex items-center space-x-2 mb-3">
              <ShieldCheck className="w-6 h-6 text-green-deep" aria-hidden="true" />
              <p className="font-poppins font-semibold text-green-deep">Certificado autêntico</p>
            </div>
            <dl className="font-roboto text-gray-700 space-y-1">
              <div><dt className="inline font-semibold">Nome: </dt><dd className="inline">{resultado.nome}</dd></div>
              <div><dt className="inline font-semibold">Curso livre: </dt><dd className="inline">{resultado.trilha_titulo}</dd></div>
              {formatarCargaHoraria(resultado.carga_horaria_min ?? null) && (
                <div><dt className="inline font-semibold">Carga horária: </dt><dd className="inline">{formatarCargaHoraria(resultado.carga_horaria_min ?? null)}</dd></div>
              )}
              <div><dt className="inline font-semibold">Aproveitamento: </dt><dd className="inline">{resultado.nota}%</dd></div>
              <div>
                <dt className="inline font-semibold">Concluído em: </dt>
                <dd className="inline">{resultado.emitido_em ? new Date(resultado.emitido_em).toLocaleDateString('pt-BR') : ''}</dd>
              </div>
              <div><dt className="inline font-semibold">Código: </dt><dd className="inline">{resultado.codigo}</dd></div>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerificarCertificado;
