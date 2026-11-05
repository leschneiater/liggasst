// Etapa 5: tela do certificado de conclusao da trilha (pedido dela 05/11).
// A emissao acontece no servidor ao abrir a tela (idempotente): quem nao
// passou na avaliacao recebe erro, nunca um certificado.
import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Award, ArrowLeft, Download, ShieldCheck } from 'lucide-react';
import {
  emitirCertificado,
  RODAPE_CERTIFICADO,
  URL_VERIFICACAO,
  formatarCargaHoraria,
  type CertificadoTrilha as Certificado,
} from '../services/certificados';
import { baixarCertificadoPdf } from '../services/certificadoPdf';
import Button from '../components/ui/Button';

const CertificadoTrilha: React.FC = () => {
  const { trailId } = useParams<{ trailId: string }>();
  const [cert, setCert] = useState<Certificado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!trailId) return;
    let vivo = true;
    emitirCertificado(trailId)
      .then((c) => { if (vivo) setCert(c); })
      .catch((e: Error) => { if (vivo) setErro(e.message); })
      .finally(() => { if (vivo) setLoading(false); });
    return () => { vivo = false; };
  }, [trailId]);

  return (
    <div className="min-h-screen bg-neutral-gray py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          to={trailId ? `/treinamentos-profissional/trilha/${trailId}` : '/treinamentos-profissional'}
          className="inline-flex items-center font-roboto text-green-deep hover:underline mb-6"
        >
          <ArrowLeft size={18} className="mr-1" aria-hidden="true" /> Voltar para a trilha
        </Link>

        {loading && <p className="font-roboto text-gray-600">Emitindo seu certificado...</p>}

        {erro && !loading && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <p className="font-roboto text-gray-700">{erro}</p>
          </div>
        )}

        {cert && !loading && (
          <>
            <div className="bg-white rounded-lg shadow-md border-2 border-green-deep p-6 sm:p-10 text-center">
              <Award className="w-12 h-12 text-green-deep mx-auto mb-2" aria-hidden="true" />
              <p className="font-poppins text-sm font-semibold text-green-deep tracking-wide">LIGGA SST</p>
              <h1 className="font-poppins text-2xl sm:text-3xl font-bold text-soft-black mb-6">
                Certificado de conclusão
              </h1>
              <p className="font-roboto text-gray-600">Certificamos que</p>
              <p className="font-poppins text-xl sm:text-2xl font-bold text-soft-black my-2">{cert.nome}</p>
              <p className="font-roboto text-gray-600">concluiu o curso livre</p>
              <p className="font-poppins text-lg sm:text-xl font-semibold text-green-deep my-2">
                {cert.trilha_titulo}
              </p>
              <p className="font-roboto text-sm text-gray-600 mt-3">
                {[
                  `aproveitamento de ${cert.nota}% na avaliação final`,
                  formatarCargaHoraria(cert.carga_horaria_min) &&
                    `carga horária de ${formatarCargaHoraria(cert.carga_horaria_min)}`,
                  `concluído em ${new Date(cert.emitido_em).toLocaleDateString('pt-BR')}`,
                ].filter(Boolean).join('  •  ')}
              </p>
              <div className="mt-8 flex items-center justify-center space-x-2 text-green-deep">
                <ShieldCheck size={18} aria-hidden="true" />
                <p className="font-roboto text-sm font-semibold">Código de autenticidade: {cert.codigo}</p>
              </div>
              <p className="font-roboto text-xs text-gray-500 mt-1 break-all">
                Verifique em {URL_VERIFICACAO}
              </p>
              <p className="font-roboto text-[11px] leading-relaxed text-gray-400 mt-8">
                {RODAPE_CERTIFICADO}
              </p>
            </div>

            <div className="mt-6 flex justify-center">
              <Button variant="primary" icon={Download} onClick={() => baixarCertificadoPdf(cert)}>
                Baixar PDF
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CertificadoTrilha;
