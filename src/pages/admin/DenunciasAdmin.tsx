import React, { useEffect, useState } from 'react';
import { Flag, CheckCircle, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import AdminAreaNav from '../../components/Layout/AdminAreaNav';
import { fetchReports, updateReportStatus, fetchProfileNames, ReportRow } from '../../services/database';

const ROTULOS_MOTIVO: Record<string, string> = {
  'spam': 'Spam',
  'assedio': 'Assédio',
  'conteudo-improprio': 'Conteúdo impróprio',
  'golpe': 'Suspeita de golpe',
  'outro': 'Outro'
};

const ROTULOS_STATUS: Record<string, string> = {
  open: 'Aberta',
  reviewed: 'Analisada',
  actioned: 'Providenciada'
};

const DenunciasAdmin: React.FC = () => {
  const [denuncias, setDenuncias] = useState<ReportRow[]>([]);
  const [nomes, setNomes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [filtro, setFiltro] = useState<'open' | 'todas'>('open');
  const [atualizando, setAtualizando] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);
    setErro(false);
    const r = await fetchReports();
    if (!r.success) {
      setErro(true);
      setLoading(false);
      return;
    }
    setDenuncias(r.data);
    const ids = [...new Set(r.data.flatMap(d => [d.reporter_id, d.reported_id]))];
    const rn = await fetchProfileNames(ids);
    if (rn.success) setNomes(rn.data);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const mudarStatus = async (id: string, status: 'reviewed' | 'actioned') => {
    setAtualizando(id);
    const r = await updateReportStatus(id, status);
    setAtualizando(null);
    if (r.success) {
      setDenuncias(prev => prev.map(d => d.id === id ? { ...d, status } : d));
      toast.success(`Denúncia marcada como ${ROTULOS_STATUS[status].toLowerCase()}.`);
    } else {
      toast.error('Não foi possível atualizar. Tente novamente.');
    }
  };

  const visiveis = filtro === 'open' ? denuncias.filter(d => d.status === 'open') : denuncias;

  return (
    <div className="min-h-screen bg-neutral-gray">
      <AdminAreaNav />
      <div className="py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="font-poppins font-bold text-3xl text-soft-black mb-2">Denúncias</h1>
            <p className="font-roboto text-gray-600">Denúncias de mensagens enviadas pelos usuários</p>
            <p className="font-roboto text-xs text-gray-400 mt-1">
              Os botões apenas registram o andamento da análise; medidas sobre contas são tomadas separadamente pela administração.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFiltro('open')}
              className={`font-roboto text-sm px-3 py-1.5 rounded-lg ${filtro === 'open' ? 'bg-green-deep text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
            >
              Abertas
            </button>
            <button
              onClick={() => setFiltro('todas')}
              className={`font-roboto text-sm px-3 py-1.5 rounded-lg ${filtro === 'todas' ? 'bg-green-deep text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
            >
              Todas
            </button>
          </div>
        </div>

        {loading && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <p className="font-roboto text-gray-600">Carregando denúncias...</p>
          </div>
        )}

        {erro && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <p className="font-roboto text-gray-600 mb-2">Não foi possível carregar as denúncias.</p>
            <button onClick={carregar} className="text-green-deep font-roboto font-medium hover:underline">
              Tentar novamente
            </button>
          </div>
        )}

        {!loading && !erro && visiveis.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <Flag size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="font-roboto text-gray-600">
              {filtro === 'open' ? 'Nenhuma denúncia aberta.' : 'Nenhuma denúncia registrada.'}
            </p>
          </div>
        )}

        {!loading && !erro && visiveis.length > 0 && (
          <div className="space-y-4">
            {visiveis.map(d => (
              <div key={d.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-poppins font-semibold text-soft-black">
                        {ROTULOS_MOTIVO[d.reason] || d.reason}
                      </span>
                      <span className={`font-roboto text-xs rounded-full px-2 py-0.5 ${
                        d.status === 'open' ? 'bg-yellow-100 text-yellow-800' :
                        d.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {ROTULOS_STATUS[d.status] || d.status}
                      </span>
                    </div>
                    <p className="font-roboto text-sm text-gray-600 mb-1">
                      <span className="font-medium">Denunciante:</span> {nomes[d.reporter_id] || 'Usuário'}
                      {' · '}
                      <span className="font-medium">Denunciado:</span> {nomes[d.reported_id] || 'Usuário'}
                    </p>
                    {d.details && (
                      <p className="font-roboto text-sm text-gray-600 whitespace-pre-wrap break-words mb-1">
                        {d.details}
                      </p>
                    )}
                    <p className="font-roboto text-xs text-gray-400">
                      {new Date(d.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  {d.status !== 'actioned' && (
                    <div className="flex flex-col gap-2 flex-shrink-0 w-full md:w-auto">
                      {d.status === 'open' && (
                        <Button
                          onClick={() => mudarStatus(d.id, 'reviewed')}
                          icon={Eye}
                          size="sm"
                          variant="outline"
                          disabled={atualizando === d.id}
                        >
                          Marcar analisada
                        </Button>
                      )}
                      <Button
                        onClick={() => mudarStatus(d.id, 'actioned')}
                        icon={CheckCircle}
                        size="sm"
                        disabled={atualizando === d.id}
                      >
                        Marcar providenciada
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

export default DenunciasAdmin;
