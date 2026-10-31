import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FileText, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import {
  ProfessionalSearchItem,
  createContract,
  fetchDemands,
  getProfessionalPublic,
} from '../../services/database';
import { DemandaGestaoRow } from './demandaGestao';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

interface ProporContratoForm {
  titulo: string;
  demandaId: string;
  valor: string;
  inicio: string;
  fim: string;
}

// Valor digitado com virgula ou ponto; vazio significa "a combinar".
const parseValor = (texto: string): number | null => {
  const limpo = texto.trim().replace(/\./g, '').replace(',', '.');
  if (limpo === '') return null;
  const numero = Number(limpo);
  return Number.isFinite(numero) && numero >= 0 ? numero : NaN;
};

type Situacao =
  | { tipo: 'carregando' }
  | { tipo: 'erro' }
  | { tipo: 'pronto'; profissional: ProfessionalSearchItem };

const ProporContrato: React.FC = () => {
  const { profissionalId } = useParams<{ profissionalId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [situacao, setSituacao] = useState<Situacao>({ tipo: 'carregando' });
  const [demandas, setDemandas] = useState<DemandaGestaoRow[]>([]);
  const [enviando, setEnviando] = useState(false);

  const { register, handleSubmit, setValue, getValues, formState: { errors } } = useForm<ProporContratoForm>({
    defaultValues: { titulo: '', demandaId: '', valor: '', inicio: '', fim: '' },
  });

  useEffect(() => {
    if (!profissionalId || !currentUser) return;
    let vivo = true;
    Promise.all([
      getProfessionalPublic(profissionalId),
      fetchDemands({ company_id: currentUser.id, status: 'active' }),
    ])
      .then(([prof, resultadoDemandas]) => {
        if (!vivo) return;
        if (!prof) {
          setSituacao({ tipo: 'erro' });
          return;
        }
        setSituacao({ tipo: 'pronto', profissional: prof });
        if (resultadoDemandas.success && Array.isArray(resultadoDemandas.data)) {
          setDemandas(resultadoDemandas.data as DemandaGestaoRow[]);
        }
      })
      .catch(() => {
        if (vivo) setSituacao({ tipo: 'erro' });
      });
    return () => { vivo = false; };
  }, [profissionalId, currentUser]);

  const aoEscolherDemanda = (evento: React.ChangeEvent<HTMLSelectElement>) => {
    const demandaId = evento.target.value;
    setValue('demandaId', demandaId);
    // Preenche o titulo com a demanda escolhida quando o campo esta vazio.
    const demanda = demandas.find((d) => d.id === demandaId);
    if (demanda && !getValues('titulo').trim()) {
      setValue('titulo', demanda.title);
    }
  };

  const onSubmit = async (data: ProporContratoForm) => {
    if (!profissionalId || situacao.tipo !== 'pronto') return;
    setEnviando(true);
    try {
      const valor = parseValor(data.valor);
      await createContract({
        professional_id: profissionalId,
        demand_id: data.demandaId || null,
        title: data.titulo.trim(),
        amount: Number.isNaN(valor) ? null : valor,
        starts_at: data.inicio || null,
        ends_at: data.fim || null,
      });
      toast.success('Proposta enviada. O profissional já pode responder na área de contratos dele.');
      navigate('/contratos-empresa');
    } catch (error) {
      console.error('Erro ao propor contrato:', error);
      toast.error('Não foi possível enviar a proposta. Verifique os dados e tente de novo.');
    } finally {
      setEnviando(false);
    }
  };

  const selectClasses = 'w-full px-4 py-2 border border-gray-300 rounded-lg font-roboto focus:outline-none focus:ring-2 focus:ring-green-deep focus:border-green-deep';
  const labelClasses = 'block font-roboto font-medium text-soft-black text-sm mb-1';

  return (
    <div className="min-h-screen bg-neutral-gray py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="font-poppins font-bold text-3xl text-soft-black mb-2">
            Propor Contrato
          </h1>
          <p className="font-roboto text-gray-600">
            {situacao.tipo === 'pronto'
              ? `Envie uma proposta de serviço de SST para ${situacao.profissional.nome}.`
              : 'Envie uma proposta de serviço de SST para o profissional.'}
          </p>
        </div>

        {situacao.tipo === 'carregando' && (
          <p className="font-roboto text-gray-500">Carregando profissional...</p>
        )}

        {situacao.tipo === 'erro' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield size={28} className="text-yellow-600" />
            </div>
            <h2 className="font-poppins font-semibold text-xl text-soft-black mb-3">
              Profissional não encontrado
            </h2>
            <p className="font-roboto text-gray-600 max-w-md mx-auto mb-6">
              Não foi possível carregar este perfil. Ele pode ter ficado indisponível.
            </p>
            <Button as={Link} to="/busca-profissionais-empresa" variant="outline" size="sm">
              Voltar à busca
            </Button>
          </div>
        )}

        {situacao.tipo === 'pronto' && (
          <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
            <Input
              label="Título do contrato"
              icon={FileText}
              placeholder="Ex: Elaboração de PGR para unidade fabril"
              error={errors.titulo?.message}
              {...register('titulo', {
                required: 'Informe o título do contrato',
                maxLength: { value: 200, message: 'Use até 200 caracteres' },
              })}
            />

            <div>
              <label htmlFor="demandaId" className={labelClasses}>
                Vincular a uma demanda ativa (opcional)
              </label>
              <select
                id="demandaId"
                className={selectClasses}
                {...register('demandaId')}
                onChange={aoEscolherDemanda}
              >
                <option value="">Sem demanda vinculada</option>
                {demandas.map((d) => (
                  <option key={d.id} value={d.id}>{d.title}</option>
                ))}
              </select>
              <p className="font-roboto text-sm text-gray-500 mt-1">
                Ao ser aceita, a proposta tira a demanda da vitrine pública e o serviço fica em andamento.
              </p>
            </div>

            <Input
              label="Valor combinado (R$, opcional)"
              placeholder="Ex: 4500,00"
              error={errors.valor?.message}
              helperText="O pagamento é combinado diretamente com o profissional; a plataforma não processa pagamentos."
              {...register('valor', {
                validate: (v) => {
                  const numero = parseValor(v);
                  return numero === null || !Number.isNaN(numero) || 'Informe um valor numérico válido';
                },
              })}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Início previsto (opcional)"
                type="date"
                {...register('inicio')}
              />
              <Input
                label="Término previsto (opcional)"
                type="date"
                error={errors.fim?.message}
                {...register('fim', {
                  validate: (v) => {
                    const inicio = getValues('inicio');
                    return !v || !inicio || v >= inicio || 'O término não pode ser antes do início';
                  },
                })}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button type="submit" loading={enviando}>
                Enviar proposta
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                disabled={enviando}
              >
                Voltar
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ProporContrato;
