import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { FileText, Save, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchDemands, updateDemand } from '../../services/database';
import {
  DemandaGestaoRow,
  TIPOS_SERVICO_DEMANDA,
  UFS,
} from './demandaGestao';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import toast from 'react-hot-toast';

interface EditarDemandaForm {
  titulo: string;
  descricao: string;
  tipoServico: string;
  localizacao: string;
  estado: string;
  orcamento: string;
  prazo: string;
  modalidade: 'presencial' | 'remoto' | 'hibrido' | '';
  urgencia: 'baixa' | 'media' | 'alta' | '';
  tipoOrcamento: 'fixo' | 'por-hora' | 'negociavel' | '';
}

type Situacao =
  | { tipo: 'carregando' }
  | { tipo: 'erro' }
  | { tipo: 'sem-acesso' }
  | { tipo: 'nao-editavel'; status: string }
  | { tipo: 'pronto'; demanda: DemandaGestaoRow };

const EditarDemanda: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [situacao, setSituacao] = useState<Situacao>({ tipo: 'carregando' });
  const [salvando, setSalvando] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<EditarDemandaForm>();

  useEffect(() => {
    if (!currentUser || !id) return;
    let vivo = true;
    fetchDemands({ id }).then((result) => {
      if (!vivo) return;
      if (!result.success) {
        setSituacao({ tipo: 'erro' });
        return;
      }
      const demanda = (Array.isArray(result.data) ? result.data[0] : null) as DemandaGestaoRow | null;
      // A vitrine publica expoe demandas ativas de outras empresas: o
      // carregamento pode trazer uma demanda que nao e da empresa logada.
      // O update seria barrado pela policy demands_update; aqui a tela ja
      // bloqueia com mensagem honesta.
      if (!demanda || demanda.company_id !== currentUser.id) {
        setSituacao({ tipo: 'sem-acesso' });
        return;
      }
      if (demanda.status !== 'active') {
        setSituacao({ tipo: 'nao-editavel', status: demanda.status });
        return;
      }
      setSituacao({ tipo: 'pronto', demanda });
      const d = demanda as DemandaGestaoRow & {
        modalidade: EditarDemandaForm['modalidade'];
        urgencia: EditarDemandaForm['urgencia'];
        tipo_orcamento: EditarDemandaForm['tipoOrcamento'];
      };
      reset({
        titulo: d.title,
        descricao: d.description ?? '',
        tipoServico: d.service_type ?? '',
        localizacao: d.city ?? '',
        estado: d.state ?? '',
        orcamento: d.budget !== null && d.budget !== undefined ? String(d.budget) : '',
        prazo: d.deadline ?? '',
        modalidade: d.modalidade ?? '',
        urgencia: d.urgencia ?? '',
        tipoOrcamento: d.tipo_orcamento ?? '',
      });
    });
    return () => { vivo = false; };
  }, [currentUser, id, reset]);

  const onSubmit = async (data: EditarDemandaForm) => {
    if (!id || situacao.tipo !== 'pronto') return;
    setSalvando(true);
    try {
      const result = await updateDemand(id, {
        title: data.titulo.trim(),
        description: data.descricao.trim(),
        service_type: data.tipoServico || null,
        city: data.localizacao.trim() || null,
        state: data.estado || null,
        budget: data.orcamento ? Number(data.orcamento) : null,
        deadline: data.prazo || null,
        modalidade: data.modalidade || null,
        urgencia: data.urgencia || null,
        tipo_orcamento: data.tipoOrcamento || null,
      });
      if (!result.success) throw new Error('Falha ao salvar');
      toast.success('Demanda atualizada com sucesso.');
      navigate('/dashboard-empresa');
    } catch (error) {
      console.error('Erro ao salvar demanda:', error);
      toast.error('Não foi possível salvar as alterações. Verifique "Minhas Demandas" antes de tentar de novo.');
    } finally {
      setSalvando(false);
    }
  };

  const selectClasses = 'w-full px-4 py-2 border border-gray-300 rounded-lg font-roboto focus:outline-none focus:ring-2 focus:ring-green-deep focus:border-green-deep';
  const labelClasses = 'block font-roboto font-medium text-soft-black text-sm mb-1';

  return (
    <div className="min-h-screen bg-neutral-gray py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="font-poppins font-bold text-3xl text-soft-black mb-2">
            Editar Demanda
          </h1>
          <p className="font-roboto text-gray-600">
            Atualize as informações da sua demanda de SST.
          </p>
        </div>

        {situacao.tipo === 'carregando' && (
          <p className="font-roboto text-gray-500">Carregando demanda...</p>
        )}

        {situacao.tipo === 'erro' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <p className="font-roboto text-gray-600 mb-4">Não foi possível carregar a demanda.</p>
            <Button as={Link} to="/dashboard-empresa" variant="outline" size="sm">
              Voltar ao painel
            </Button>
          </div>
        )}

        {(situacao.tipo === 'sem-acesso' || situacao.tipo === 'nao-editavel') && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield size={28} className="text-yellow-600" />
            </div>
            <h2 className="font-poppins font-semibold text-xl text-soft-black mb-3">
              {situacao.tipo === 'sem-acesso'
                ? 'Demanda não encontrada'
                : 'Esta demanda não pode mais ser editada'}
            </h2>
            <p className="font-roboto text-gray-600 max-w-md mx-auto mb-6">
              {situacao.tipo === 'sem-acesso'
                ? 'Ela não está entre as demandas da sua empresa.'
                : 'Somente demandas ativas podem ser editadas.'}
            </p>
            <Button as={Link} to="/dashboard-empresa" variant="outline" size="sm">
              Voltar ao painel
            </Button>
          </div>
        )}

        {situacao.tipo === 'pronto' && (
          <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
            <Input
              label="Título da demanda"
              icon={FileText}
              placeholder="Ex: Elaboração de PGR para unidade fabril"
              error={errors.titulo?.message}
              {...register('titulo', { required: 'Informe o título da demanda' })}
            />

            <div>
              <label htmlFor="descricao" className={labelClasses}>Descrição</label>
              <textarea
                id="descricao"
                rows={5}
                className={selectClasses}
                placeholder="Descreva o serviço de SST que sua empresa precisa"
                {...register('descricao', { required: 'Descreva a demanda' })}
              />
              {errors.descricao && (
                <p className="font-roboto text-sm text-red-600 mt-1">{errors.descricao.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="tipoServico" className={labelClasses}>Tipo de serviço</label>
              <select id="tipoServico" className={selectClasses} {...register('tipoServico')}>
                <option value="">Selecione</option>
                {TIPOS_SERVICO_DEMANDA.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Cidade"
                placeholder="Ex: São Paulo"
                {...register('localizacao')}
              />
              <div>
                <label htmlFor="estado" className={labelClasses}>UF</label>
                <select id="estado" className={selectClasses} {...register('estado')}>
                  <option value="">Selecione</option>
                  {UFS.map((uf) => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Orçamento (R$)"
                placeholder="Ex: 4500"
                error={errors.orcamento?.message}
                {...register('orcamento', {
                  validate: (v) => v === '' || (!isNaN(Number(v)) && Number(v) >= 0) || 'Informe um valor numérico válido',
                })}
              />
              <Input
                label="Prazo desejado"
                type="date"
                {...register('prazo')}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="modalidade" className={labelClasses}>Modalidade</label>
                <select id="modalidade" className={selectClasses} {...register('modalidade')}>
                  <option value="">Selecione</option>
                  <option value="presencial">Presencial</option>
                  <option value="remoto">Remoto</option>
                  <option value="hibrido">Híbrido</option>
                </select>
              </div>
              <div>
                <label htmlFor="urgencia" className={labelClasses}>Urgência</label>
                <select id="urgencia" className={selectClasses} {...register('urgencia')}>
                  <option value="">Selecione</option>
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                </select>
              </div>
              <div>
                <label htmlFor="tipoOrcamento" className={labelClasses}>Tipo de orçamento</label>
                <select id="tipoOrcamento" className={selectClasses} {...register('tipoOrcamento')}>
                  <option value="">Selecione</option>
                  <option value="fixo">Valor fechado</option>
                  <option value="por-hora">Por hora</option>
                  <option value="negociavel">Negociável</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button type="submit" icon={Save} loading={salvando}>
                Salvar alterações
              </Button>
              <Button as={Link} to="/dashboard-empresa" variant="outline">
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default EditarDemanda;
