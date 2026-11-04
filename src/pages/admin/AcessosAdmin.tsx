// Aba "Acessos" do admin (decisoes dela 04/11): monitorar logins/acessos
// (ultimo acesso, dias ativos 30d, plano) e dar/revogar cortesia (acesso
// pago gratis, sem cobranca). Selo "Cortesia" na lista; motivo so no detalhe.
import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Gift } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import AdminAreaNav from '../../components/Layout/AdminAreaNav';
import {
  AcessoRow, CortesiaRow, concederCortesia, fetchAcessos,
  fetchCortesiasAtivas, revogarCortesia,
} from '../../services/acessos';

const NOMES_PLANO: Record<string, string> = {
  free: 'Gratuito',
  pro_professional: 'Profissional',
  pro_company: 'Empresa',
};

const AcessosAdmin: React.FC = () => {
  const [linhas, setLinhas] = useState<AcessoRow[]>([]);
  const [cortesias, setCortesias] = useState<Map<string, CortesiaRow>>(new Map());
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [detalhe, setDetalhe] = useState<string | null>(null);
  const [dandoPara, setDandoPara] = useState<AcessoRow | null>(null);
  const [motivo, setMotivo] = useState('');
  const [validaAte, setValidaAte] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    setLoading(true); setErro(null);
    try {
      const [lista, ativas] = await Promise.all([fetchAcessos(), fetchCortesiasAtivas()]);
      setLinhas(lista);
      setCortesias(new Map(ativas.map((c) => [c.profile_id, c])));
    } catch { setErro('Não foi possível carregar os acessos.'); }
    setLoading(false);
  };
  useEffect(() => { carregar(); }, []);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return linhas;
    return linhas.filter((l) =>
      l.display_name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q));
  }, [linhas, busca]);

  const dar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dandoPara) return;
    if (motivo.trim().length < 3) { toast.error('Escreva o motivo da cortesia.'); return; }
    setSalvando(true);
    try {
      await concederCortesia(dandoPara.profile_id, motivo.trim(), validaAte || null);
      toast.success(`Cortesia concedida para ${dandoPara.display_name || dandoPara.email}.`);
      setDandoPara(null); setMotivo(''); setValidaAte('');
      await carregar();
    } catch { toast.error('Não foi possível conceder a cortesia.'); }
    setSalvando(false);
  };

  const revogar = async (l: AcessoRow) => {
    const c = cortesias.get(l.profile_id);
    if (!c) return;
    if (!window.confirm(`Revogar a cortesia de ${l.display_name || l.email}? O acesso pago dela termina na hora.`)) return;
    try { await revogarCortesia(c.id); toast.success('Cortesia revogada.'); await carregar(); }
    catch { toast.error('Não foi possível revogar.'); }
  };

  const campo = 'w-full rounded-lg border border-gray-300 px-3 py-2 font-roboto text-sm';
  return (
    <div className="min-h-screen bg-neutral-gray">
      <AdminAreaNav />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-poppins font-bold text-2xl text-soft-black">Acessos</h1>
          <Button variant="secondary" onClick={carregar} icon={RefreshCw}>Atualizar</Button>
        </div>

        <p className="font-roboto text-sm text-gray-600 mb-4">
          Quem entra no sistema, plano atual e cortesias (acesso pago grátis, sem cobrança).
          A contagem de dias ativos começou a acumular em 04/11/2026.
        </p>

        <input
          type="search"
          aria-label="Buscar por nome ou e-mail"
          placeholder="Buscar por nome ou e-mail"
          className={`${campo} mb-4 max-w-md`}
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        {loading && <p className="font-roboto text-gray-600">Carregando...</p>}
        {erro && <p className="font-roboto text-red-600" role="alert">{erro}</p>}
        {!loading && !erro && filtradas.length === 0 && (
          <p className="font-roboto text-gray-600">Nenhuma conta encontrada.</p>
        )}

        <ul className="space-y-3">
          {filtradas.map((l) => {
            const cort = cortesias.get(l.profile_id);
            return (
              <li key={l.profile_id} className="bg-white rounded-xl border border-gray-100 p-4" data-testid="acesso-item">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-poppins font-semibold text-soft-black">
                      {l.display_name || l.email}
                      <span className="font-roboto font-normal text-xs text-gray-500 ml-2">
                        {l.role === 'company' ? 'Empresa' : l.role === 'admin' ? 'Admin' : 'Profissional'}
                      </span>
                    </p>
                    <p className="font-roboto text-xs text-gray-500">{l.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-roboto text-xs px-2 py-1 rounded-full ${l.plano === 'free' ? 'bg-gray-100 text-gray-700' : 'bg-green-light text-green-deep'}`}>
                      {NOMES_PLANO[l.plano] ?? l.plano}
                    </span>
                    {l.cortesia_ativa && (
                      <span className="font-roboto text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800">Cortesia</span>
                    )}
                  </div>
                </div>
                <p className="font-roboto text-sm text-gray-600 mt-2">
                  Último acesso: {l.ultimo_acesso ? new Date(l.ultimo_acesso + 'T00:00:00').toLocaleDateString('pt-BR') : 'nenhum desde 04/11'}
                  {' · '}Dias ativos (30d): {l.dias_ativos_30d}
                </p>
                {detalhe === l.profile_id && cort && (
                  <div className="mt-2 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2" data-testid="cortesia-detalhe">
                    <p className="font-roboto text-sm text-gray-700">Motivo: {cort.motivo}</p>
                    <p className="font-roboto text-xs text-gray-500 mt-1">
                      Concedida em {new Date(cort.concedida_em).toLocaleDateString('pt-BR')}
                      {cort.valida_ate
                        ? ` · válida até ${new Date(cort.valida_ate + 'T00:00:00').toLocaleDateString('pt-BR')}`
                        : ' · sem data fim'}
                    </p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  {l.cortesia_ativa ? (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => setDetalhe(detalhe === l.profile_id ? null : l.profile_id)}>
                        {detalhe === l.profile_id ? 'Ocultar detalhe' : 'Ver detalhe'}
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => revogar(l)}>Revogar cortesia</Button>
                    </>
                  ) : (
                    <Button size="sm" onClick={() => { setDandoPara(l); setMotivo(''); setValidaAte(''); }} icon={Gift}>
                      Dar cortesia
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {dandoPara && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" role="dialog" aria-label="Dar cortesia">
            <form onSubmit={dar} className="bg-white rounded-xl p-6 w-full max-w-md space-y-3">
              <h2 className="font-poppins font-semibold text-lg text-soft-black">
                Dar cortesia para {dandoPara.display_name || dandoPara.email}
              </h2>
              <p className="font-roboto text-sm text-gray-600">
                Ela passa a ter acesso de assinante pago (sem cobrança e sem ver indicação de cortesia).
              </p>
              <div>
                <label htmlFor="cortesia-motivo" className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                <input id="cortesia-motivo" className={campo} value={motivo} maxLength={200}
                  onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: parceria, amigo da família" />
              </div>
              <div>
                <label htmlFor="cortesia-fim" className="block text-sm font-medium text-gray-700 mb-1">Válida até (opcional)</label>
                <input id="cortesia-fim" type="date" className={campo} value={validaAte}
                  onChange={(e) => setValidaAte(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={salvando}>Conceder</Button>
                <Button type="button" variant="secondary" onClick={() => setDandoPara(null)}>Cancelar</Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default AcessosAdmin;
