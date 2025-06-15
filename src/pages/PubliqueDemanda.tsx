import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { 
  Plus, 
  Building2, 
  MapPin, 
  Calendar, 
  DollarSign,
  FileText,
  Users,
  Clock,
  Send,
  CheckCircle
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import toast from 'react-hot-toast';

interface DemandFormData {
  titulo: string;
  descricao: string;
  tipoServico: string;
  prazo: string;
  orcamento: string;
  tipoOrcamento: 'fixo' | 'por-hora' | 'negociavel';
  localizacao: string;
  estado: string;
  modalidade: 'presencial' | 'remoto' | 'hibrido';
  urgencia: 'baixa' | 'media' | 'alta';
  requisitos: string;
  empresa: string;
  contato: string;
  telefone: string;
}

const PubliqueDemanda: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [demandPublished, setDemandPublished] = useState(false);
  
  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm<DemandFormData>();

  const tiposServico = [
    'PCMSO - Programa de Controle Médico de Saúde Ocupacional',
    'PGR - Programa de Gerenciamento de Riscos',
    'LTCAT - Laudo Técnico de Condições Ambientais do Trabalho',
    'PPP - Perfil Profissiográfico Previdenciário',
    'PCMAT - Programa de Condições e Meio Ambiente de Trabalho',
    'Treinamentos NR (Normas Regulamentadoras)',
    'Consultoria em SST',
    'Auditoria de Segurança',
    'Perícia Técnica',
    'Elaboração de Procedimentos',
    'Análise de Riscos',
    'Outro'
  ];

  const estados = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  const onSubmit = async (data: DemandFormData) => {
    setLoading(true);
    try {
      // Simular publicação da demanda
      await new Promise(resolve => setTimeout(resolve, 2000));
      setDemandPublished(true);
      toast.success('Demanda publicada com sucesso!');
    } catch (error) {
      toast.error('Erro ao publicar demanda');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    setStep(step + 1);
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  if (demandPublished) {
    return (
      <div className="min-h-screen bg-neutral-gray py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
            <div className="w-16 h-16 bg-green-light rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={32} className="text-green-deep" />
            </div>
            
            <h2 className="font-poppins font-bold text-2xl text-soft-black mb-4">
              Demanda Publicada com Sucesso!
            </h2>
            
            <p className="font-roboto text-gray-600 mb-6">
              Sua demanda foi publicada e os profissionais qualificados já podem visualizá-la. 
              Você receberá propostas em breve.
            </p>
            
            <div className="bg-green-light bg-opacity-20 p-4 rounded-lg mb-6">
              <h3 className="font-poppins font-semibold text-green-deep mb-2">
                Próximos Passos:
              </h3>
              <ul className="font-roboto text-sm text-green-deep space-y-1 text-left">
                <li>• Profissionais interessados entrarão em contato</li>
                <li>• Analise as propostas recebidas</li>
                <li>• Compare perfis e avaliações</li>
                <li>• Escolha o profissional ideal</li>
              </ul>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                onClick={() => {
                  setDemandPublished(false);
                  setStep(1);
                  reset();
                }}
                variant="outline"
                className="flex-1"
              >
                Publicar Nova Demanda
              </Button>
              <Button 
                onClick={() => window.location.href = '/dashboard-empresa'}
                className="flex-1"
              >
                Ir para Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-gray py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-poppins font-bold text-3xl text-soft-black mb-2">
            Publique sua Demanda
          </h1>
          <p className="font-roboto text-gray-600">
            Descreva sua necessidade e receba propostas de profissionais qualificados
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className={`flex items-center ${step >= 1 ? 'text-green-deep' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm ${step >= 1 ? 'bg-green-deep border-green-deep text-white' : 'border-gray-300'}`}>
                1
              </div>
              <span className="ml-2 font-roboto text-sm hidden sm:inline">Detalhes do Serviço</span>
            </div>
            <div className={`flex-1 h-1 mx-4 ${step >= 2 ? 'bg-green-deep' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center ${step >= 2 ? 'text-green-deep' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm ${step >= 2 ? 'bg-green-deep border-green-deep text-white' : 'border-gray-300'}`}>
                2
              </div>
              <span className="ml-2 font-roboto text-sm hidden sm:inline">Orçamento e Prazo</span>
            </div>
            <div className={`flex-1 h-1 mx-4 ${step >= 3 ? 'bg-green-deep' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center ${step >= 3 ? 'text-green-deep' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm ${step >= 3 ? 'bg-green-deep border-green-deep text-white' : 'border-gray-300'}`}>
                3
              </div>
              <span className="ml-2 font-roboto text-sm hidden sm:inline">Contato</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Step 1: Service Details */}
            {step === 1 && (
              <div className="space-y-6">
                <h2 className="font-poppins font-semibold text-xl text-soft-black mb-4">
                  Detalhes do Serviço
                </h2>

                <Input
                  label="Título da Demanda"
                  icon={FileText}
                  placeholder="Ex: Elaboração de PCMSO para indústria metalúrgica"
                  error={errors.titulo?.message}
                  {...register('titulo', { required: 'Título é obrigatório' })}
                />

                <div>
                  <label className="block font-roboto font-medium text-soft-black text-sm mb-1">
                    Tipo de Serviço
                  </label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-deep focus:border-green-deep"
                    {...register('tipoServico', { required: 'Tipo de serviço é obrigatório' })}
                  >
                    <option value="">Selecione o tipo de serviço</option>
                    {tiposServico.map((tipo) => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                  {errors.tipoServico && (
                    <p className="text-red-500 text-sm font-roboto mt-1">{errors.tipoServico.message}</p>
                  )}
                </div>

                <div>
                  <label className="block font-roboto font-medium text-soft-black text-sm mb-1">
                    Descrição Detalhada
                  </label>
                  <textarea
                    rows={5}
                    placeholder="Descreva em detalhes o que você precisa, incluindo especificações técnicas, número de funcionários, tipo de atividade da empresa, etc."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-deep focus:border-green-deep"
                    {...register('descricao', { required: 'Descrição é obrigatória' })}
                  />
                  {errors.descricao && (
                    <p className="text-red-500 text-sm font-roboto mt-1">{errors.descricao.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Localização"
                    icon={MapPin}
                    placeholder="Cidade onde será executado"
                    error={errors.localizacao?.message}
                    {...register('localizacao', { required: 'Localização é obrigatória' })}
                  />
                  
                  <div>
                    <label className="block font-roboto font-medium text-soft-black text-sm mb-1">
                      Estado
                    </label>
                    <select
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-deep focus:border-green-deep"
                      {...register('estado', { required: 'Estado é obrigatório' })}
                    >
                      <option value="">Selecione</option>
                      {estados.map((estado) => (
                        <option key={estado} value={estado}>{estado}</option>
                      ))}
                    </select>
                    {errors.estado && (
                      <p className="text-red-500 text-sm font-roboto mt-1">{errors.estado.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-roboto font-medium text-soft-black text-sm mb-1">
                      Modalidade
                    </label>
                    <select
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-deep focus:border-green-deep"
                      {...register('modalidade', { required: 'Modalidade é obrigatória' })}
                    >
                      <option value="">Selecione</option>
                      <option value="presencial">Presencial</option>
                      <option value="remoto">Remoto</option>
                      <option value="hibrido">Híbrido</option>
                    </select>
                    {errors.modalidade && (
                      <p className="text-red-500 text-sm font-roboto mt-1">{errors.modalidade.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block font-roboto font-medium text-soft-black text-sm mb-1">
                      Urgência
                    </label>
                    <select
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-deep focus:border-green-deep"
                      {...register('urgencia', { required: 'Urgência é obrigatória' })}
                    >
                      <option value="">Selecione</option>
                      <option value="baixa">Baixa</option>
                      <option value="media">Média</option>
                      <option value="alta">Alta</option>
                    </select>
                    {errors.urgencia && (
                      <p className="text-red-500 text-sm font-roboto mt-1">{errors.urgencia.message}</p>
                    )}
                  </div>
                </div>

                <Button type="button" onClick={nextStep} fullWidth size="lg">
                  Próximo
                </Button>
              </div>
            )}

            {/* Step 2: Budget and Timeline */}
            {step === 2 && (
              <div className="space-y-6">
                <h2 className="font-poppins font-semibold text-xl text-soft-black mb-4">
                  Orçamento e Prazo
                </h2>

                <div>
                  <label className="block font-roboto font-medium text-soft-black text-sm mb-1">
                    Tipo de Orçamento
                  </label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-deep focus:border-green-deep"
                    {...register('tipoOrcamento', { required: 'Tipo de orçamento é obrigatório' })}
                  >
                    <option value="">Selecione</option>
                    <option value="fixo">Valor Fixo</option>
                    <option value="por-hora">Por Hora</option>
                    <option value="negociavel">Negociável</option>
                  </select>
                  {errors.tipoOrcamento && (
                    <p className="text-red-500 text-sm font-roboto mt-1">{errors.tipoOrcamento.message}</p>
                  )}
                </div>

                <Input
                  label="Orçamento (R$)"
                  type="number"
                  icon={DollarSign}
                  placeholder="Ex: 2500"
                  error={errors.orcamento?.message}
                  {...register('orcamento')}
                />

                <Input
                  label="Prazo Desejado"
                  type="date"
                  icon={Calendar}
                  error={errors.prazo?.message}
                  {...register('prazo', { required: 'Prazo é obrigatório' })}
                />

                <div>
                  <label className="block font-roboto font-medium text-soft-black text-sm mb-1">
                    Requisitos Específicos
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Descreva requisitos específicos como certificações necessárias, experiência mínima, etc."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-deep focus:border-green-deep"
                    {...register('requisitos')}
                  />
                </div>

                <div className="flex gap-4">
                  <Button type="button" onClick={prevStep} variant="outline" fullWidth>
                    Voltar
                  </Button>
                  <Button type="button" onClick={nextStep} fullWidth>
                    Próximo
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Contact */}
            {step === 3 && (
              <div className="space-y-6">
                <h2 className="font-poppins font-semibold text-xl text-soft-black mb-4">
                  Informações de Contato
                </h2>

                <Input
                  label="Nome da Empresa"
                  icon={Building2}
                  placeholder="Razão social da empresa"
                  error={errors.empresa?.message}
                  {...register('empresa', { required: 'Nome da empresa é obrigatório' })}
                />

                <Input
                  label="Pessoa de Contato"
                  icon={Users}
                  placeholder="Nome do responsável"
                  error={errors.contato?.message}
                  {...register('contato', { required: 'Pessoa de contato é obrigatória' })}
                />

                <Input
                  label="Telefone"
                  icon={Clock}
                  placeholder="(11) 99999-9999"
                  error={errors.telefone?.message}
                  {...register('telefone', { required: 'Telefone é obrigatório' })}
                />

                <div className="bg-green-light bg-opacity-20 p-4 rounded-lg">
                  <h3 className="font-poppins font-semibold text-green-deep mb-2">
                    Como funciona:
                  </h3>
                  <ul className="font-roboto text-sm text-green-deep space-y-1">
                    <li>• Sua demanda será publicada para profissionais qualificados</li>
                    <li>• Você receberá propostas diretamente no seu e-mail</li>
                    <li>• Analise os perfis e escolha o melhor profissional</li>
                    <li>• Negocie diretamente com o profissional escolhido</li>
                  </ul>
                </div>

                <div className="flex gap-4">
                  <Button type="button" onClick={prevStep} variant="outline" fullWidth>
                    Voltar
                  </Button>
                  <Button type="submit" loading={loading} fullWidth size="lg" icon={Send}>
                    Publicar Demanda
                  </Button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default PubliqueDemanda;