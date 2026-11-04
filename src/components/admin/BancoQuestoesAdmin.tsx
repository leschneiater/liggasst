import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../ui/Button';
import {
  createQuestao,
  deleteQuestao,
  fetchQuestoesAdmin,
  QuestaoBanco,
  SecaoTrilha,
  TrilhaAdmin,
  updateQuestao,
  updateTrilha,
} from '../../services/trilhas';

// Banco de questoes + configuracao da prova (Etapa 3), so para trilhas
// 'certified'. O banco precisa ter pelo menos exam_question_count questoes
// ativas; o sorteio do membro e feito no servidor, sem gabarito no cliente.
const BancoQuestoesAdmin: React.FC<{
  trilha: TrilhaAdmin;
  secoes: SecaoTrilha[];
}> = ({ trilha, secoes }) => {
  const [questoes, setQuestoes] = useState<QuestaoBanco[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [config, setConfig] = useState({
    exam_question_count: trilha.exam_question_count,
    exam_pass_score: trilha.exam_pass_score,
  });
  const [salvandoConfig, setSalvandoConfig] = useState(false);
  const [form, setForm] = useState({
    enunciado: '',
    section_id: '' as string,
    opcoes: ['', '', '', ''] as string[],
    correta: 0,
  });
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    setCarregando(true);
    const r = await fetchQuestoesAdmin(trilha.id);
    if (r.success) setQuestoes(r.data);
    setCarregando(false);
  };

  useEffect(() => { carregar(); }, [trilha.id]);

  const ativas = questoes.filter((q) => q.ativo).length;

  const salvarConfig = async () => {
    const n = config.exam_question_count;
    const corte = config.exam_pass_score;
    if (!Number.isInteger(n) || n < 1 || n > 50) {
      toast.error('Número de questões da prova deve ser entre 1 e 50.');
      return;
    }
    if (!Number.isInteger(corte) || corte < 0 || corte > 100) {
      toast.error('Nota mínima deve ser entre 0 e 100.');
      return;
    }
    setSalvandoConfig(true);
    const r = await updateTrilha(trilha.id, {
      exam_question_count: n,
      exam_pass_score: corte,
    });
    setSalvandoConfig(false);
    if (r.success) toast.success('Configuração da avaliação salva.');
    else toast.error('Não foi possível salvar. Tente novamente.');
  };

  const salvarQuestao = async () => {
    const enunciado = form.enunciado.trim();
    const opcoes = form.opcoes.map((o) => o.trim()).filter((o) => o.length > 0);
    if (enunciado.length < 5) {
      toast.error('Escreva o enunciado da questão.');
      return;
    }
    if (opcoes.length < 2) {
      toast.error('Preencha pelo menos 2 alternativas.');
      return;
    }
    if (form.correta >= opcoes.length) {
      toast.error('Marque qual alternativa preenchida é a correta.');
      return;
    }
    setSalvando(true);
    const r = await createQuestao({
      trail_id: trilha.id,
      section_id: form.section_id || null,
      enunciado,
      opcoes,
      correta: form.correta,
    });
    setSalvando(false);
    if (!r.success) {
      toast.error('Não foi possível salvar a questão. Tente novamente.');
      return;
    }
    setForm({ enunciado: '', section_id: '', opcoes: ['', '', '', ''], correta: 0 });
    await carregar();
    toast.success('Questão adicionada ao banco.');
  };

  const alternarAtiva = async (q: QuestaoBanco) => {
    const r = await updateQuestao(q.id, { ativo: !q.ativo });
    if (r.success) {
      await carregar();
      toast.success(q.ativo ? 'Questão desativada.' : 'Questão reativada.');
    } else {
      toast.error('Não foi possível atualizar. Tente novamente.');
    }
  };

  const excluir = async (q: QuestaoBanco) => {
    const r = await deleteQuestao(q.id);
    if (r.success) {
      await carregar();
      toast.success('Questão excluída.');
    } else {
      toast.error('Não foi possível excluir. Tente novamente.');
    }
  };

  const tituloSecao = (id: string | null) =>
    secoes.find((s) => s.id === id)?.titulo ?? null;

  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      <h4 className="font-poppins font-semibold text-gray-900 mb-3">Avaliação (prova)</h4>

      <div className="bg-gray-50 rounded-lg p-3 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor={`conf-n-${trilha.id}`} className="block text-sm font-medium text-gray-700 mb-1">
              Questões por prova
            </label>
            <input
              id={`conf-n-${trilha.id}`}
              type="number"
              min={1}
              max={50}
              value={config.exam_question_count}
              onChange={(e) => setConfig({ ...config, exam_question_count: Number(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor={`conf-corte-${trilha.id}`} className="block text-sm font-medium text-gray-700 mb-1">
              Nota mínima (%)
            </label>
            <input
              id={`conf-corte-${trilha.id}`}
              type="number"
              min={0}
              max={100}
              value={config.exam_pass_score}
              onChange={(e) => setConfig({ ...config, exam_pass_score: Number(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Banco: {ativas} {ativas === 1 ? 'questão ativa' : 'questões ativas'}
            {ativas < config.exam_question_count && (
              <span className="text-amber-700"> (faltam questões para a prova rodar)</span>
            )}
          </p>
          <Button variant="secondary" size="sm" onClick={salvarConfig} disabled={salvandoConfig}>
            {salvandoConfig ? 'Salvando...' : 'Salvar configuração'}
          </Button>
        </div>
      </div>

      {carregando && <p className="font-roboto text-sm text-gray-600">Carregando questões...</p>}
      {!carregando && questoes.length === 0 && (
        <p className="font-roboto text-sm text-gray-600 mb-3">Nenhuma questão no banco ainda.</p>
      )}
      <div className="space-y-2 mb-4">
        {questoes.map((q, i) => (
          <div key={q.id} className="flex items-start justify-between bg-gray-50 rounded-lg px-3 py-2">
            <div className="text-sm text-gray-800">
              <span className={q.ativo ? '' : 'line-through text-gray-400'}>
                {i + 1}. {q.enunciado}
              </span>
              <span className="block text-xs text-gray-500">
                {q.opcoes.length} alternativas
                {tituloSecao(q.section_id) ? ` · tópico: ${tituloSecao(q.section_id)}` : ' · sem tópico'}
                {!q.ativo && ' · inativa'}
              </span>
            </div>
            <div className="flex items-center space-x-1 shrink-0">
              <Button variant="outline" size="sm" onClick={() => alternarAtiva(q)}>
                {q.ativo ? 'Desativar' : 'Reativar'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => excluir(q)} aria-label={`Excluir questão ${i + 1}`}>
                <Trash2 className="w-4 h-4 text-red-600" aria-hidden="true" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 rounded-lg p-3 space-y-3">
        <h5 className="font-poppins font-medium text-gray-900 text-sm">
          <Plus className="w-4 h-4 inline mr-1" aria-hidden="true" />
          Nova questão
        </h5>
        <div>
          <label htmlFor={`q-enunciado-${trilha.id}`} className="block text-sm font-medium text-gray-700 mb-1">
            Enunciado
          </label>
          <textarea
            id={`q-enunciado-${trilha.id}`}
            value={form.enunciado}
            onChange={(e) => setForm({ ...form, enunciado: e.target.value })}
            maxLength={1000}
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor={`q-topico-${trilha.id}`} className="block text-sm font-medium text-gray-700 mb-1">
            Tópico de revisão (seção de referência)
          </label>
          <select
            id={`q-topico-${trilha.id}`}
            value={form.section_id}
            onChange={(e) => setForm({ ...form, section_id: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Conteúdo geral da trilha</option>
            {secoes.map((s) => (
              <option key={s.id} value={s.id}>{s.titulo}</option>
            ))}
          </select>
        </div>
        <fieldset>
          <legend className="text-sm font-medium text-gray-700 mb-1">
            Alternativas (marque a correta)
          </legend>
          <div className="space-y-2">
            {form.opcoes.map((op, i) => (
              <div key={i} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name={`q-correta-${trilha.id}`}
                  checked={form.correta === i}
                  onChange={() => setForm({ ...form, correta: i })}
                  aria-label={`Alternativa ${i + 1} é a correta`}
                  className="accent-green-deep"
                />
                <input
                  type="text"
                  value={op}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      opcoes: form.opcoes.map((o, oi) => (oi === i ? e.target.value : o)),
                    })
                  }
                  maxLength={300}
                  placeholder={`Alternativa ${i + 1}`}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            ))}
          </div>
        </fieldset>
        <Button variant="secondary" size="sm" onClick={salvarQuestao} disabled={salvando}>
          {salvando ? 'Salvando...' : 'Adicionar questão'}
        </Button>
      </div>
    </div>
  );
};

export default BancoQuestoesAdmin;
