// Calendario de conformidade da empresa (recurso do plano Empresa pago).
// v1: so metadados + validade (sem upload); alertas in-app por vencimento.
// Conta free ve o aviso com caminho para /planos; a gestao dos itens e paga.
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarClock, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import AvisoLimitesPlano from '../../components/AvisoLimitesPlano';
import { usePlanoPago } from '../../hooks/usePlanoPago';
import {
  atualizarItemConformidade,
  criarItemConformidade,
  excluirItemConformidade,
  fetchItensConformidade,
} from '../../services/conformidade';
import {
  DIAS_ALERTA_VENCIMENTO,
  ItemConformidade,
  ROTULOS_SAUDE,
  TIPOS_DOCUMENTO,
  diasParaVencer,
  ordenarItens,
  resumoSaude,
  saudeItem,
} from '../../utils/calendarioConformidade';

interface FormState {
  titulo: string;
  tipo: string;
  validade: string;
  responsavel: string;
  observacoes: string;
}

const FORM_VAZIO: FormState = { titulo: '', tipo: TIPOS_DOCUMENTO[0], validade: '', responsavel: '', observacoes: '' };

const ESTILO_SAUDE: Record<string, string> = {
  vencido: 'bg-red-100 text-red-800',
  a_vencer: 'bg-amber-100 text-amber-800',
  em_dia: 'bg-green-light text-green-deep',
};

const formatarData = (iso: string): string => {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
};

const CalendarioConformidade: React.FC = () => {
  const navigate = useNavigate();
  const planoPago = usePlanoPago();
  const [itens, setItens] = useState<ItemConformidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [formAberto, setFormAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<string | null>(null);
  const hoje = useMemo(() => new Date(), []);

  const carregar = async () => {
    setLoading(true);
    setErro(false);
    const r = await fetchItensConformidade();
    if (!r.success) {
      setErro(true);
      setLoading(false);
      return;
    }
    setItens((r.data ?? []) as ItemConformidade[]);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const abrirNovo = () => {
    setForm(FORM_VAZIO);
    setEditandoId(null);
    setFormAberto(true);
  };

  const abrirEdicao = (item: ItemConformidade) => {
    setForm({
      titulo: item.titulo,
      tipo: item.tipo,
      validade: item.validade,
      responsavel: item.responsavel ?? '',
      observacoes: item.observacoes ?? '',
    });
    setEditandoId(item.id);
    setFormAberto(true);
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titulo.trim() || !form.validade) return;
    setSalvando(true);
    const payload = {
      titulo: form.titulo,
      tipo: form.tipo,
      validade: form.validade,
      responsavel: form.responsavel || null,
      observacoes: form.observacoes || null,
    };
    const r = editandoId
      ? await atualizarItemConformidade(editandoId, payload)
      : await criarItemConformidade(payload);
    setSalvando(false);
    if (!r.success) {
      toast.error(
        (r as { conflict?: boolean }).conflict
          ? 'Este item não está mais disponível. A lista foi atualizada.'
          : 'Não foi possível salvar. Tente novamente.',
      );
      setFormAberto(false);
      setEditandoId(null);
      carregar();
      return;
    }
    toast.success(editandoId ? 'Documento atualizado.' : 'Documento adicionado.');
    setFormAberto(false);
    setEditandoId(null);
    carregar();
  };

  const excluir = async (id: string) => {
    const r = await excluirItemConformidade(id);
    if (!r.success) {
      toast.error(
        (r as { conflict?: boolean }).conflict
          ? 'Este item já não existia. A lista foi atualizada.'
          : 'Não foi possível excluir. Tente novamente.',
      );
    } else {
      toast.success('Documento removido.');
    }
    setConfirmandoExclusao(null);
    carregar();
  };

  const ordenados = ordenarItens(itens, hoje);
  const resumo = resumoSaude(itens, hoje);

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
            Calendário de Conformidade
          </h1>
          <p className="font-roboto text-gray-600">
            Registre as validades dos documentos de SST da sua empresa e acompanhe os vencimentos.
            Os alertas aparecem aqui e no seu painel.
          </p>
        </div>

        {!planoPago && (
          <div data-testid="gate-calendario">
            <AvisoLimitesPlano tipo="calendario" pago={planoPago} />
          </div>
        )}

        {planoPago && (
          <>
            <div className="flex flex-wrap items-center gap-3 mb-6" data-testid="resumo-conformidade">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-roboto bg-red-100 text-red-800">
                {resumo.vencidos} vencido{resumo.vencidos === 1 ? '' : 's'}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-roboto bg-amber-100 text-amber-800">
                {resumo.aVencer} vencendo em até {DIAS_ALERTA_VENCIMENTO} dias
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-roboto bg-green-light text-green-deep">
                {resumo.emDia} em dia
              </span>
              <div className="flex-1" />
              <Button size="sm" icon={Plus} onClick={abrirNovo}>
                Adicionar documento
              </Button>
            </div>

            {formAberto && (
              <form
                onSubmit={salvar}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6"
                data-testid="form-conformidade"
              >
                <h2 className="font-poppins font-semibold text-lg text-soft-black mb-4">
                  {editandoId ? 'Editar documento' : 'Novo documento'}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block font-roboto text-sm text-gray-700 mb-1">Documento</label>
                    <input
                      type="text"
                      value={form.titulo}
                      onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                      placeholder="Ex.: PGR da matriz"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg font-roboto text-sm focus:outline-none focus:ring-2 focus:ring-green-medium"
                      maxLength={200}
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-roboto text-sm text-gray-700 mb-1">Tipo</label>
                    <select
                      value={form.tipo}
                      onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg font-roboto text-sm focus:outline-none focus:ring-2 focus:ring-green-medium"
                    >
                      {TIPOS_DOCUMENTO.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-roboto text-sm text-gray-700 mb-1">Validade</label>
                    <input
                      type="date"
                      value={form.validade}
                      onChange={(e) => setForm({ ...form, validade: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg font-roboto text-sm focus:outline-none focus:ring-2 focus:ring-green-medium"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-roboto text-sm text-gray-700 mb-1">Responsável (opcional)</label>
                    <input
                      type="text"
                      value={form.responsavel}
                      onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
                      placeholder="Ex.: Eng. de segurança"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg font-roboto text-sm focus:outline-none focus:ring-2 focus:ring-green-medium"
                      maxLength={200}
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block font-roboto text-sm text-gray-700 mb-1">Observações (opcional)</label>
                  <textarea
                    value={form.observacoes}
                    onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                    placeholder="Anotações internas sobre renovação, órgão emissor, etc."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-roboto text-sm focus:outline-none focus:ring-2 focus:ring-green-medium"
                    rows={3}
                    maxLength={2000}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" loading={salvando}>
                    {editandoId ? 'Salvar alterações' : 'Adicionar'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => { setFormAberto(false); setEditandoId(null); }}
                    disabled={salvando}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            )}

            {loading && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <p className="font-roboto text-gray-600">Carregando documentos...</p>
              </div>
            )}

            {erro && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <p className="font-roboto text-gray-600 mb-2">Não foi possível carregar seus documentos.</p>
                <button onClick={carregar} className="text-green-deep font-roboto font-medium hover:underline">
                  Tentar novamente
                </button>
              </div>
            )}

            {!loading && !erro && itens.length === 0 && !formAberto && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <CalendarClock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="font-roboto text-gray-600 mb-1">Nenhum documento registrado ainda.</p>
                <p className="font-roboto text-sm text-gray-500">
                  Adicione o primeiro para começar a receber os alertas de vencimento.
                </p>
              </div>
            )}

            {!loading && !erro && ordenados.length > 0 && (
              <ul className="space-y-3" data-testid="lista-conformidade">
                {ordenados.map((item) => {
                  const saude = saudeItem(item.validade, hoje);
                  const dias = diasParaVencer(item.validade, hoje);
                  return (
                    <li key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h2 className="font-poppins font-semibold text-lg text-soft-black">
                              {item.titulo}
                            </h2>
                            <span className={`inline-block px-2 py-1 text-xs font-roboto rounded-full ${ESTILO_SAUDE[saude]}`}>
                              {saude === 'vencido'
                                ? `Vencido há ${Math.abs(dias)} dia${Math.abs(dias) === 1 ? '' : 's'}`
                                : saude === 'a_vencer'
                                  ? dias === 0
                                    ? 'Vence hoje'
                                    : `Vence em ${dias} dia${dias === 1 ? '' : 's'}`
                                  : ROTULOS_SAUDE[saude]}
                            </span>
                          </div>
                          <p className="font-roboto text-sm text-gray-700">
                            {item.tipo} • Validade: {formatarData(item.validade)}
                            {item.responsavel ? ` • Responsável: ${item.responsavel}` : ''}
                          </p>
                          {item.observacoes && (
                            <p className="font-roboto text-sm text-gray-500 mt-1 whitespace-pre-wrap break-words">
                              {item.observacoes}
                            </p>
                          )}
                          {saude !== 'em_dia' && (
                            <div className="mt-3">
                              <Button
                                as={Link}
                                to={`/busca-profissionais-empresa?q=${encodeURIComponent(item.tipo)}`}
                                variant="outline"
                                size="sm"
                                icon={Search}
                                data-testid={`sugerir-profissionais-${item.id}`}
                              >
                                Buscar profissionais para renovar
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button size="sm" variant="outline" icon={Pencil} onClick={() => abrirEdicao(item)}>
                            Editar
                          </Button>
                          {confirmandoExclusao !== item.id && (
                            <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setConfirmandoExclusao(item.id)}>
                              Excluir
                            </Button>
                          )}
                        </div>
                      </div>
                      {confirmandoExclusao === item.id && (
                        <div className="mt-3 bg-neutral-gray rounded-lg p-3">
                          <p className="font-roboto text-sm text-soft-black mb-2">
                            Excluir este documento do calendário?
                          </p>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => excluir(item.id)}>
                              Confirmar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setConfirmandoExclusao(null)}>
                              Voltar
                            </Button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CalendarioConformidade;
