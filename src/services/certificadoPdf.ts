// Gera o PDF do certificado de conclusao (Etapa 5, desde 05/11).
// Sem assinatura nem registro de curador: so a plataforma emite, com codigo
// de autenticidade e link publico de verificacao.
import { jsPDF } from 'jspdf';
import {
  RODAPE_CERTIFICADO,
  URL_VERIFICACAO,
  formatarCargaHoraria,
  type CertificadoTrilha,
} from './certificados';

const VERDE_ESCURO: [number, number, number] = [27, 67, 50]; // green-deep
const VERDE_MEDIO: [number, number, number] = [45, 106, 79];

export const montarCertificadoPdf = (cert: CertificadoTrilha): jsPDF => {
  // A4 paisagem (297 x 210 mm)
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const cx = 148.5;

  // Moldura dupla
  doc.setDrawColor(...VERDE_ESCURO);
  doc.setLineWidth(1.4);
  doc.rect(10, 10, 277, 190);
  doc.setLineWidth(0.4);
  doc.rect(13, 13, 271, 184);

  // Cabecalho
  doc.setTextColor(...VERDE_ESCURO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('LIGGA SST', cx, 30, { align: 'center' });
  doc.setFontSize(30);
  doc.text('Certificado de conclusão', cx, 47, { align: 'center' });
  doc.setDrawColor(...VERDE_MEDIO);
  doc.setLineWidth(0.8);
  doc.line(88.5, 53, 208.5, 53);

  // Corpo
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(60, 60, 60);
  doc.text('Certificamos que', cx, 70, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(26, 26, 26);
  doc.text(cert.nome, cx, 84, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(60, 60, 60);
  doc.text('concluiu o curso livre', cx, 96, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...VERDE_ESCURO);
  const tituloLinhas = doc.splitTextToSize(cert.trilha_titulo, 220) as string[];
  doc.text(tituloLinhas, cx, 106, { align: 'center' });

  const y = 106 + tituloLinhas.length * 8 + 4;
  const carga = formatarCargaHoraria(cert.carga_horaria_min);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(60, 60, 60);
  const partes = [
    `com aproveitamento de ${cert.nota}% na avaliação final`,
    carga ? `carga horária de ${carga}` : null,
    `concluído em ${new Date(cert.emitido_em).toLocaleDateString('pt-BR')}`,
  ].filter(Boolean) as string[];
  doc.text(partes.join('  •  '), cx, y, { align: 'center' });

  // Autenticidade
  doc.setFontSize(11);
  doc.setTextColor(...VERDE_ESCURO);
  doc.text(`Código de autenticidade: ${cert.codigo}`, cx, 165, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(90, 90, 90);
  doc.text(`Verifique em ${URL_VERIFICACAO}`, cx, 172, { align: 'center' });

  // Rodape legal (texto aprovado por ela)
  doc.setFontSize(8.5);
  doc.setTextColor(110, 110, 110);
  const rodape = doc.splitTextToSize(RODAPE_CERTIFICADO, 250) as string[];
  doc.text(rodape, cx, 184, { align: 'center' });

  return doc;
};

export const baixarCertificadoPdf = (cert: CertificadoTrilha): void => {
  montarCertificadoPdf(cert).save(`certificado-${cert.codigo}.pdf`);
};
