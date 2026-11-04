// Capacitacao da equipe (feature 3 do plano Empresa pago): a empresa
// cadastra funcionarios pelo e-mail, atribui treinamentos publicados da
// plataforma e acompanha as conclusoes. O funcionario conclui pela propria
// conta em /minha-capacitacao; o certificado chega com a infra de
// certificados (etapa separada).
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, GraduationCap, Trash2, UserX, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import AvisoLimitesPlano from '../../components/AvisoLimitesPlano';
import { usePlanoPago } from '../../hooks/usePlanoPago';
import {
  FuncionarioEquipe,
  AtribuicaoTreinamento,
  fetchEquipe,
  adicionarFuncionario,
  setFuncionarioAtivo,
  removerFuncionario,
  fetchAtribuicoesEquipe,
  atribuirTreinamento,
  removerAtribuicao,
} from '../../services/capacitacaoEquipe';
import { fetchTrainingsMembro, TrainingRow } from '../../services/database';
import {
  rotuloStatusAtribuicao,
  rotuloVinculo,
  progressoDaEquipe,
  atribuicoesDoFuncionario,
} from '../../utils/capacitacaoEquipe';

const CapacitacaoEquipe: React.FC = () => {
  const navigate = useNavigate();
  const planoPago = usePlanoPago();
  const [equipe, setEquipe] = useState<FuncionarioEquipe[]>([]);
  const [atribuicoes, setAtribuicoes] = useState<AtribuicaoTreinamento[]>([]);
  const [treinamentos, setTreinamentos] = useState<TrainingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [selecao, setSelecao] = useState<Record<string, string>>({});

  const carregar = useCallback(async () => {
    setLoading(true);
    const [rEquipe, rAtrib, rTrein] = await Promise.all([
      fetchEquipe(),
      fetchAtribuicoesEquipe(),
      fetchTrainingsMembro(),
    ]);
    if (!rEquipe.success || !rAtrib.success || !rTrein.success) {
      toast.error('Não foi possível carregar a capacitação da equipe. Tente novamente.');
    }
    if (rEquipe.success) setEquipe(rEquipe.data);
    if (rAtrib.success) setAtribuicoes(rAtrib.data);
    if (rTrein.success) setTreinamentos(rTrein.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (planoPago) carregar();
  }, [planoPago, carregar]);

  const adicionar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !nome.trim()) {
      toast.error('Informe o nome e o e-mail do funcionário.');
      return;
    }
    setSalvando(true);
    const r = await adicionarFuncionario(email, nome);
    setSalvando(false);
    if (!r.success) {
      toast.error('Não foi possível adicionar. Confira o e-mail e tente novamente.');
      return;
    }
    toast.success('Funcionário adicionado. Peça a ele para criar a conta de Funcionário com este e-mail.');
    setEmail('');
    setNome('');
    carregar();
  };

  const alternarAtivo = async (f: FuncionarioEquipe) => {
    const r = await setFuncionarioAtivo(f.id, !f.active);
    if (!r.success) {
      toast.error('Não foi possível atualizar. Tente novamente.');
      return;
    }
    toast.success(f.active ? 'Funcionário desativado.' : 'Funcionário reativado.');
    carregar();
  };

  const remover = async (f: FuncionarioEquipe) => {
    const r = await removerFuncionario(f.id);
    if (!r.success) {
      toast.error('Não foi possível remover. Tente novamente.');
      return;
    }
    toast.success('Funcionário removido da equipe.');
    carregar();
  };

  const atribuir = async (f: FuncionarioEquipe) => {
    const trainingId = selecao[f.id];
    if (!trainingId) return;
    const r = await atribuirTreinamento(f.id, trainingId);
    if (!r.success) {
      toast.error('Não foi possível atribuir. Tente novamente.');
      return;
    }
    toast.success('Treinamento atribuído.');
    setSelecao((s) => ({ ...s, [f.id]: '' }));
    carregar();
  };

  const desatribuir = async (a: AtribuicaoTreinamento) => {
    const r = await removerAtribuicao(a.id);
    if (!r.success) {
      toast.error('Não foi possível remover a atribuição. Tente novamente.');
      return;
    }
    toast.success('Atribuição removida.');
    carregar();
  };

  const progresso = useMemo(() => progressoDaEquipe(atribuicoes), [atribuicoes]);

  return (
    <div className="min-h-screen bg-neutral-gray py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate('/dashboard-empresa')}>
            Voltar ao painel
          </Button>
        </div>
        <div className="mb-8">
          <h1 className="font-poppins font-bold text-3xl text-soft-black mb-2">
            Capacitação da Equipe
          </h1>
          <p className="font-roboto text-gray-600">
            Cadastre seus funcionários pelo e-mail, atribua os treinamentos de SST da plataforma
            e acompanhe quem concluiu. Cada funcionário acessa com a própria conta (cadastro de
            Funcionário com o mesmo e-mail) e marca a conclusão depois de fazer o treinamento.
          </p>
        </div>

        {!planoPago && (
          <div data-testid="gate-equipe">
            <AvisoLimitesPlano tipo="equipe" pago={planoPago} />
          </div>
        )}

        {planoPago && (
          <>
            <div className="flex flex-wrap items-center gap-3 mb-6" data-testid="resumo-equipe">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-roboto bg-white border border-gray-200 text-gray-700">
                {equipe.filter((f) => f.active).length} funcionário{equipe.filter((f) => f.active).length === 1 ? '' : 's'} na equipe
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-roboto bg-green-light text-green-deep">
                {progresso.concluidos} de {progresso.total} treinamentos concluídos ({progresso.percentual}%)
              </span>
            </div>

            <form onSubmit={adicionar} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8" data-testid="form-funcionario">
              <h2 className="font-poppins font-semibold text-lg text-soft-black mb-4">Adicionar funcionário</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <Input
                  label="Nome do funcionário"
                  placeholder="Nome completo"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
                <Input
                  label="E-mail do funcionário"
                  type="email"
                  placeholder="email@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button type="submit" size="sm" icon={UserPlus} disabled={salvando}>
                {salvando ? 'Adicionando...' : 'Adicionar'}
              </Button>
            </form>

            {loading ? (
              <p className="font-roboto text-gray-600">Carregando...</p>
            ) : equipe.length === 0 ? (
              <p className="font-roboto text-gray-600" data-testid="equipe-vazia">
                Nenhum funcionário cadastrado ainda. Adicione o primeiro acima.
              </p>
            ) : (
              <div className="space-y-4">
                {equipe.map((f) => {
                  const doFunc = atribuicoesDoFuncionario(atribuicoes, f.id);
                  const disponiveis = treinamentos.filter(
                    (t) => !doFunc.some((a) => a.training_id === t.id),
                  );
                  const vinculo = rotuloVinculo(f);
                  return (
                    <div key={f.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6" data-testid={`funcionario-${f.id}`}>
                      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                        <div>
                          <p className="font-poppins font-semibold text-soft-black">{f.display_name}</p>
                          <p className="font-roboto text-sm text-gray-600">{f.email}</p>
                          <span
                            className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-roboto ${
                              !f.active
                                ? 'bg-gray-100 text-gray-500'
                                : f.employee_profile_id
                                  ? 'bg-green-light text-green-deep'
                                  : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {vinculo}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={f.active ? UserX : UserCheck}
                            onClick={() => alternarAtivo(f)}
                          >
                            {f.active ? 'Desativar' : 'Reativar'}
                          </Button>
                          <Button variant="ghost" size="sm" icon={Trash2} onClick={() => remover(f)}>
                            Remover
                          </Button>
                        </div>
                      </div>

                      {doFunc.length > 0 && (
                        <ul className="divide-y divide-gray-100 mb-4" data-testid={`atribuicoes-${f.id}`}>
                          {doFunc.map((a) => (
                            <li key={a.id} className="py-2 flex flex-wrap items-center gap-3">
                              <GraduationCap className="w-4 h-4 text-green-deep flex-shrink-0" aria-hidden="true" />
                              <span className="font-roboto text-sm text-soft-black flex-1">
                                {a.trainings?.title ?? 'Treinamento'}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-roboto ${
                                  a.status === 'completed'
                                    ? 'bg-green-light text-green-deep'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {rotuloStatusAtribuicao(a.status)}
                                {a.status === 'completed' && a.completed_at
                                  ? ` em ${new Date(a.completed_at).toLocaleDateString('pt-BR')}`
                                  : ''}
                              </span>
                              <button
                                type="button"
                                onClick={() => desatribuir(a)}
                                className="text-gray-400 hover:text-red-600"
                                aria-label={`Remover atribuição ${a.trainings?.title ?? ''}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}

                      {f.active && disponiveis.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={selecao[f.id] ?? ''}
                            onChange={(e) => setSelecao((s) => ({ ...s, [f.id]: e.target.value }))}
                            className="flex-1 min-w-[200px] border border-gray-300 rounded-lg px-3 py-2 font-roboto text-sm"
                            aria-label={`Treinamento para ${f.display_name}`}
                          >
                            <option value="">Escolha um treinamento para atribuir...</option>
                            {disponiveis.map((t) => (
                              <option key={t.id} value={t.id}>{t.title}</option>
                            ))}
                          </select>
                          <Button size="sm" onClick={() => atribuir(f)} disabled={!selecao[f.id]}>
                            Atribuir
                          </Button>
                        </div>
                      )}
                      {f.active && disponiveis.length === 0 && treinamentos.length > 0 && (
                        <p className="font-roboto text-sm text-gray-500">
                          Todos os treinamentos publicados já foram atribuídos a este funcionário.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CapacitacaoEquipe;
