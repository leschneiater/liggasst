// Mock do cliente Supabase para o build E2E local (vite.e2e.config.ts).
// Simula sessao + leituras para o app REAL rodar sem backend.
// Papel escolhido pela querystring: ?role=admin|company|professional.
const params = new URLSearchParams(window.location.search);
const role = (params.get('role') ?? 'professional') as 'admin' | 'company' | 'professional';
// Estado da moderacao exibido nas fixtures (evidencia do fluxo de denuncia):
// padrao = comentario visivel; 'em-revisao' = oculto apos denuncia aberta;
// 'excluida' = admin excluiu o comentario; 'mantida' = admin manteve (reaparece).
const cenario = params.get('cenario') ?? 'padrao';

const agora = '2026-10-30T20:00:00Z';
const user = {
  id: 'user-e2e-1',
  email: 'e2e@liggasst.local',
  email_confirmed_at: agora,
  created_at: agora,
  updated_at: agora,
  last_sign_in_at: agora,
  aud: 'authenticated',
  app_metadata: {},
  user_metadata: {},
  role: 'authenticated',
};

const profile = {
  id: user.id,
  role,
  display_name: role === 'admin' ? 'Admin LiggaSST' : role === 'company' ? 'Empresa Demo' : 'Profissional Demo',
  email: user.email,
  verification_status: 'approved',
  avatar_path: null,
  is_test: false,
  created_at: agora,
};

const linha = (id: string, titulo: string, audience: string, status: string, extra: Record<string, unknown> = {}) => ({
  id, title: titulo, description: 'Conteúdo de capacitação em SST com foco em prevenção.',
  audience, youtube_url: null, pdf_path: null, link_url: null, status,
  created_by: 'admin', created_at: agora, updated_at: agora, ...extra,
});
const trainings = [
  linha('1', 'NR-35 - Trabalho em altura', 'both', 'published', {
    youtube_url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    pdf_path: '11111111-1111-1111-1111-111111111111.pdf',
    link_url: 'https://www.gov.br/trabalho-e-emprego/pt-br',
  }),
  linha('2', 'Primeiros socorros na empresa', 'company', 'published', {
    link_url: 'https://exemplo.com/apostila',
  }),
  linha('3', 'Uso correto de EPIs', 'professional', 'draft', {
    pdf_path: '22222222-2222-2222-2222-222222222222.pdf',
  }),
];


// Fixtures ricas para o painel admin (somente build E2E local; nunca entram
// no bundle de producao, que nao importa este arquivo).
const membro = (id: string, role: string, display_name: string, state: string, city: string, created_at: string, extra: Record<string, unknown> = {}) => ({
  id, role, display_name, email: `${id}@fixture.local`, phone: null, city, state,
  verification_status: 'approved', avatar_path: null, is_test: false, created_at, ...extra,
});
const profilesFix = [
  profile as unknown as Record<string, unknown>,
  membro('p1', 'professional', 'Ana Lima', 'SP', 'Campinas', '2026-10-02T10:00:00Z'),
  membro('p2', 'professional', 'Bruno Reis', 'SP', 'São Paulo', '2026-09-14T10:00:00Z'),
  membro('p3', 'professional', 'Carla Nunes', 'RJ', 'Rio de Janeiro', '2026-08-20T10:00:00Z'),
  membro('p4', 'professional', 'Diego Prado', 'MG', 'Belo Horizonte', '2026-10-18T10:00:00Z'),
  membro('e1', 'company', 'TechCorp Ltda', 'SP', 'São Paulo', '2026-10-15T10:00:00Z'),
  membro('e2', 'company', 'Indústria Moderna', 'RJ', 'Duque de Caxias', '2026-07-30T10:00:00Z'),
  membro('e3', 'company', 'Construtech', 'MG', 'Contagem', '2026-10-25T10:00:00Z'),
];
const professionalsFix = [
  { profile_id: 'p1', education: 'Técnico em Segurança', specialization: 'PGR', experience: '5 anos', hourly_rate: 90 },
  { profile_id: 'p2', education: 'Engenharia', specialization: 'NR-35', experience: '8 anos', hourly_rate: 120 },
  { profile_id: 'p3', education: 'Enfermagem', specialization: 'PCMSO', experience: '6 anos', hourly_rate: 100 },
  { profile_id: 'p4', education: 'Técnico em Segurança', specialization: 'CIPA', experience: '3 anos', hourly_rate: 70 },
];
const companiesFix = [
  { profile_id: 'e1', segment: 'Tecnologia', employee_count: '51-100', responsible_name: 'Carlos Dias', responsible_email: 'carlos@techcorp.com', responsible_phone: null },
  { profile_id: 'e2', segment: 'Metalúrgica', employee_count: '501-1000', responsible_name: 'Marina Souza', responsible_email: 'marina@imod.com', responsible_phone: null },
  { profile_id: 'e3', segment: 'Construção Civil', employee_count: '101-500', responsible_name: 'Paulo Mendes', responsible_email: 'paulo@construtech.com', responsible_phone: null },
];
const demandsFix = [
  // Demandas da propria empresa e2e (role=company): alimentam o painel, a
  // edicao e os relatorios no build local. Nunca entram no bundle de producao.
  { id: 'd-prop-1', title: 'Elaboração de PGR - unidade 2', company_id: user.id, description: 'PGR para a segunda unidade fabril, com equipe de 80 colaboradores.', service_type: 'PGR - Programa de Gerenciamento de Riscos', city: 'São Paulo', state: 'SP', budget: 5200, deadline: '2026-12-10', status: 'active', modalidade: 'presencial', urgencia: 'media', tipo_orcamento: 'fixo', created_at: '2026-10-28T10:00:00Z' },
  { id: 'd-prop-2', title: 'PCMSO anual 2025', company_id: user.id, description: 'Renovação do PCMSO.', service_type: 'PCMSO - Programa de Controle Médico de Saúde Ocupacional', city: 'São Paulo', state: 'SP', budget: 3800, deadline: null, status: 'completed', modalidade: null, urgencia: null, tipo_orcamento: null, created_at: '2026-09-05T10:00:00Z' },
  { id: 'd1', title: 'Elaboração de PGR', company_id: 'e1', service_type: 'PGR', city: 'São Paulo', state: 'SP', budget: 4500, deadline: '2026-11-30', status: 'active', created_at: '2026-10-25T10:00:00Z' },
  { id: 'd2', title: 'Treinamento NR-35 para equipe', company_id: 'e2', service_type: 'NR-35', city: 'Duque de Caxias', state: 'RJ', budget: 8000, deadline: '2026-12-15', status: 'active', created_at: '2026-10-20T10:00:00Z' },
  { id: 'd3', title: 'PCMSO anual', company_id: 'e3', service_type: 'PCMSO', city: 'Contagem', state: 'MG', budget: 6000, deadline: '2026-11-20', status: 'completed', created_at: '2026-09-10T10:00:00Z' },
];
const reportsFix = [
  { id: 'r1', reporter_id: 'p1', reported_id: 'e1', message_id: null, reason: 'spam', details: 'Mensagem suspeita', status: 'open', created_at: '2026-10-29T10:00:00Z' },
  { id: 'r2', reporter_id: 'e2', reported_id: 'p3', message_id: null, reason: 'conduta', details: null, status: 'reviewed', created_at: '2026-09-15T10:00:00Z' },
];

// Fixtures de contratos para o build E2E local: a area Contratos dos dois
// paineis e o formulario de proposta. listar_contratos devolve as linhas ja
// com o nome da contraparte, como a RPC real. Nunca entram no bundle de
// producao, que nao importa este arquivo.
const contratosEmpresaFix = [
  { id: 'c1', demand_id: 'd-prop-1', company_id: user.id, professional_id: 'p1', status: 'pending', title: null, amount: 5200, starts_at: '2026-11-10', ends_at: null, progress: 0, created_at: '2026-10-29T14:00:00Z', contraparte_nome: 'Ana Lima', demanda_titulo: 'Elaboração de PGR - unidade 2' },
  { id: 'c2', demand_id: null, company_id: user.id, professional_id: 'p2', status: 'in_progress', title: 'Consultoria mensal de SST', amount: 3200, starts_at: '2026-10-15', ends_at: '2026-12-15', progress: 40, created_at: '2026-10-12T09:00:00Z', contraparte_nome: 'Bruno Reis', demanda_titulo: null },
  { id: 'c3', demand_id: null, company_id: user.id, professional_id: 'p3', status: 'completed', title: 'PCMSO anual 2025', amount: 3800, starts_at: '2026-08-01', ends_at: '2026-09-30', progress: 100, created_at: '2026-07-28T09:00:00Z', contraparte_nome: 'Carla Nunes', demanda_titulo: null },
  { id: 'c4', demand_id: null, company_id: user.id, professional_id: 'p4', status: 'completed', title: 'Laudo ergonômico setor produtivo', amount: 2400, starts_at: '2026-09-01', ends_at: '2026-09-20', progress: 100, created_at: '2026-08-25T09:00:00Z', contraparte_nome: 'Diego Prado', demanda_titulo: null },
];

// Fixtures de avaliações (somente build E2E): cobrem os estados
// pode-avaliar, enviada-oculta e revelada, a vitrine e a fila da admin.
const avaliacoesPendentesFix = [{
  contract_id: 'c3', contraparte_nome: 'Carla Nunes', contrato_titulo: 'PCMSO anual 2025',
  concluido_em: '2026-10-28T10:00:00Z', prazo_fim: '2026-11-11T10:00:00Z',
}];

const minhasAvaliacoesEmpresaFix = [
  { id: 'r1', contract_id: 'c4', direcao: 'feita', score: 5, comment: 'Laudo detalhado e entregue antes do prazo.', comentario_oculto: false, created_at: '2026-10-26T10:00:00Z', contraparte_nome: 'Diego Prado', contrato_titulo: 'Laudo ergonômico setor produtivo' },
  { id: 'r2', contract_id: 'c4', direcao: 'recebida', score: 4, comment: 'Empresa organizada, dados enviados rápido.', comentario_oculto: false, created_at: '2026-10-27T10:00:00Z', contraparte_nome: 'Diego Prado', contrato_titulo: 'Laudo ergonômico setor produtivo' },
];

const minhasAvaliacoesProfissionalFix = [
  { id: 'r3', contract_id: 'c7', direcao: 'feita', score: 5, comment: 'Escopo claro e pagamento combinado sem atrito.', comentario_oculto: false, created_at: '2026-10-29T10:00:00Z', contraparte_nome: 'Clínica Vida', contrato_titulo: 'PCMSO anual 2025' },
];

// Perfil de profissional: quem avalia é a empresa; perfil de empresa: quem
// avalia é o profissional. Cada direção com autores e comentários coerentes.
// Comentário da avaliação r6 segue o cenario: oculto em revisão ou excluído
// chega ao público como null (nota e autora preservadas), como no RPC real.
const comentarioR6 = (cenario === 'em-revisao' || cenario === 'excluida')
  ? null
  : 'Profissional pontual, laudo entregue antes do prazo.';
const avaliacoesPerfilProfissionalFix = [
  { id: 'r6', rater_id: 'e1', score: 5, comment: comentarioR6, created_at: '2026-10-27T10:00:00Z', autor_nome: 'TechCorp Ltda', contrato_titulo: 'Laudo ergonômico setor produtivo' },
  { id: 'r7', rater_id: 'e3', score: 4, comment: 'Domínio técnico e boa comunicação com a equipe de obra.', created_at: '2026-10-20T10:00:00Z', autor_nome: 'Construtech', contrato_titulo: 'Treinamento NR-35' },
];
const avaliacoesPerfilEmpresaFix = [
  { id: 'r2', rater_id: 'p4', score: 4, comment: 'Empresa organizada, dados enviados rápido.', created_at: '2026-10-27T10:00:00Z', autor_nome: 'Diego Prado', contrato_titulo: 'Laudo ergonômico setor produtivo' },
  { id: 'r5', rater_id: 'p5', score: 5, comment: 'Processo tranquilo do início ao fim.', created_at: '2026-10-20T10:00:00Z', autor_nome: 'Marina Duarte', contrato_titulo: 'Treinamento NR-10' },
];

// Denuncia da avaliacao r6 acompanha o cenario: aberta durante a revisao;
// 'reviewed' apos Manter (comentario reaparece) ou Excluir (comment_removed_at
// marcado; o texto segue retido aqui no admin para auditoria).
const denunciaR6 = ({
  'padrao':     { status: 'open', comment_removed_at: null },
  'em-revisao': { status: 'open', comment_removed_at: null },
  'excluida':   { status: 'reviewed', comment_removed_at: '2026-10-31T12:30:00Z' },
  'mantida':    { status: 'reviewed', comment_removed_at: null },
} as Record<string, { status: string; comment_removed_at: string | null }>)[cenario]
  ?? { status: 'open', comment_removed_at: null };
const denunciasAvaliacoesEstado = [
  { report_id: 'rp1', rating_id: 'r6', reason: 'conteudo-improprio', details: 'Comentário com dados pessoais do avaliado.', status: denunciaR6.status, created_at: '2026-10-30T15:00:00Z', reporter_nome: 'Carla Nunes', autor_nome: 'TechCorp Ltda', avaliado_nome: 'Ana Lima', score: 5, comment: 'Profissional pontual, laudo entregue antes do prazo.', comment_removed_at: denunciaR6.comment_removed_at, denuncias_abertas: denunciaR6.status === 'open' ? 1 : 0 },
  { report_id: 'rp2', rating_id: 'r8', reason: 'spam', details: null, status: 'actioned', created_at: '2026-10-29T12:00:00Z', reporter_nome: 'Bruno Reis', autor_nome: 'Ana Lima', avaliado_nome: 'Bruno Reis', score: 1, comment: 'Comentário removido da exibição pública.', comment_removed_at: '2026-10-29T18:00:00Z', denuncias_abertas: 0 },
];
const contratosProfissionalFix = [
  { id: 'c4', demand_id: 'd1', company_id: 'e1', professional_id: user.id, status: 'pending', title: null, amount: 4500, starts_at: '2026-11-05', ends_at: null, progress: 0, created_at: '2026-10-29T16:30:00Z', contraparte_nome: 'TechCorp Ltda', demanda_titulo: 'Elaboração de PGR' },
  { id: 'c5', demand_id: null, company_id: 'e2', professional_id: user.id, status: 'in_progress', title: 'Treinamento NR-35 - turma novembro', amount: 8000, starts_at: '2026-10-20', ends_at: '2026-11-20', progress: 60, created_at: '2026-10-18T11:00:00Z', contraparte_nome: 'Indústria Moderna', demanda_titulo: null },
  { id: 'c6', demand_id: null, company_id: 'e3', professional_id: user.id, status: 'cancelled', title: 'Auditoria de segurança - planta Contagem', amount: 6000, starts_at: null, ends_at: null, progress: 0, created_at: '2026-09-02T10:00:00Z', contraparte_nome: 'Construtech', demanda_titulo: null },
  { id: 'c7', demand_id: null, company_id: 'e4', professional_id: user.id, status: 'completed', title: 'PCMSO anual 2025', amount: 3800, starts_at: '2026-08-01', ends_at: '2026-09-30', progress: 100, created_at: '2026-07-28T09:00:00Z', contraparte_nome: 'Clínica Vida', demanda_titulo: null },
];
const profissionalPublicoFix = [{
  professional_id: 'p1',
  display_name: 'Ana Lima',
  education: 'Técnica em Segurança do Trabalho',
  specialization: 'PGR, NR-35',
  experience: '5 anos',
  city: 'Campinas',
  state: 'SP',
  hourly_rate: 90,
  service_radius: '50km',
  description: 'Técnica em segurança do trabalho com experiência em indústrias.',
  availability: ['Manhãs', 'Tardes'],
  avatar_path: null,
}];

interface Filtro { col: string; val: unknown }

const builder = (tabela: string) => {
  const filtros: Filtro[] = [];
  let singleMode: 'single' | 'maybeSingle' | null = null;
  let updatePayload: Record<string, unknown> | null = null;
  const resolver = () => {
    let linhas: Record<string, unknown>[] = [];
    if (tabela === 'profiles') linhas = profilesFix;
    if (tabela === 'professionals') linhas = professionalsFix as unknown as Record<string, unknown>[];
    if (tabela === 'companies') linhas = companiesFix as unknown as Record<string, unknown>[];
    if (tabela === 'demands') linhas = demandsFix as unknown as Record<string, unknown>[];
    if (tabela === 'message_reports') linhas = reportsFix as unknown as Record<string, unknown>[];
    if (tabela === 'trainings') linhas = trainings as unknown as Record<string, unknown>[];
    for (const f of filtros) linhas = linhas.filter((l) => l[f.col] === f.val);
    if (updatePayload) {
      // Simula update ... .eq(...): aplica o payload nas linhas filtradas.
      for (const l of linhas) Object.assign(l, updatePayload);
    }
    if (singleMode) return { data: linhas[0] ?? null, error: null };
    return { data: linhas, error: null, count: linhas.length };
  };
  const q: Record<string, unknown> & { then?: unknown } = {};
  const chain = (nome: string) => (...args: unknown[]) => {
    if (nome === 'eq') filtros.push({ col: args[0] as string, val: args[1] });
    if (nome === 'update') updatePayload = args[0] as Record<string, unknown>;
    if (nome === 'single' || nome === 'maybeSingle') singleMode = nome;
    return q;
  };
  for (const m of ['select', 'eq', 'order', 'limit', 'insert', 'update', 'delete', 'upsert', 'in', 'neq', 'gte', 'lte', 'ilike', 'or', 'range', 'single', 'maybeSingle']) {
    q[m] = chain(m);
  }
  q.then = (resolve: (v: unknown) => unknown) => Promise.resolve(resolver()).then(resolve);
  return q;
};

export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: { user, access_token: 'e2e' } }, error: null }),
    getUser: async () => ({ data: { user }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword: async () => ({ data: { user }, error: null }),
    signOut: async () => ({ error: null }),
    signUp: async () => ({ data: { user }, error: null }),
  },
  from: (tabela: string) => builder(tabela),
  storage: {
    from: () => ({
      createSignedUrl: async () => ({ data: { signedUrl: 'https://exemplo.com/assinado.pdf' }, error: null }),
      upload: async () => ({ data: { path: 'x' }, error: null }),
      remove: async () => ({ data: [], error: null }),
      list: async () => ({ data: [], error: null }),
      getPublicUrl: () => ({ data: { publicUrl: 'https://exemplo.com/x.png' } }),
    }),
  },
  functions: {
    invoke: async () => ({ data: { signedUrl: 'https://exemplo.com/assinado.pdf', expiresIn: 300 }, error: null }),
  },
  rpc: (fn: string, params?: Record<string, unknown>) => {
    const wrap = (data: unknown) => {
      const r = { data, error: null };
      const p = Promise.resolve(r);
      return { then: p.then.bind(p), maybeSingle: async () => r, single: async () => r };
    };
    const rpcInterno = (fn2: string) => {
    if (fn2 === 'search_companies') {
      return wrap([
          { id: 'e1', display_name: 'TechCorp Ltda', segment: 'Tecnologia', city: 'São Paulo', state: 'SP', employee_count: '51-100', description: 'Indústria de componentes eletrônicos com três unidades fabris.', needs: ['PGR', 'PCMSO', 'LTCAT'] },
          { id: 'e3', display_name: 'Construtech', segment: 'Construção Civil', city: 'Contagem', state: 'MG', employee_count: '101-500', description: 'Construtora com obras industriais em Minas Gerais.', needs: ['NR-35', 'Treinamentos'] },
      ]);
    }
    if (fn2 === 'listar_contratos') {
      const linhasRpc = role === 'company' ? contratosEmpresaFix
        : role === 'professional' ? contratosProfissionalFix
        : [];
      return wrap(linhasRpc);
    }
    if (fn2 === 'get_professional_public') return wrap(profissionalPublicoFix);
    if (fn2 === 'avaliacoes_pendentes') return wrap(role === 'admin' ? [] : avaliacoesPendentesFix);
    if (fn2 === 'minhas_avaliacoes') {
      return wrap(role === 'company' ? minhasAvaliacoesEmpresaFix : role === 'professional' ? minhasAvaliacoesProfissionalFix : []);
    }
    if (fn2 === 'avaliacoes_resumo') return wrap({ media: 4.5, total: 2 });
    if (fn2 === 'avaliacoes_do_perfil') {
      const perfil = String(params?.p_profile ?? '');
      return wrap(perfil.startsWith('e') ? avaliacoesPerfilEmpresaFix : avaliacoesPerfilProfissionalFix);
    }
    if (fn2 === 'admin_denuncias_avaliacoes') return wrap(denunciasAvaliacoesEstado);
    if (fn2 === 'admin_revisar_denuncia_avaliacao') {
      // Stateful: registra a decisão para a próxima leitura do painel.
      const alvo = denunciasAvaliacoesEstado.find((d) => d.report_id === params?.p_report_id);
      if (alvo) {
        alvo.status = 'reviewed';
        if (params?.p_acao === 'excluir-comentario') alvo.comment_removed_at = '2026-10-31T12:30:00Z';
      }
      return wrap(null);
    }
    if (fn2 === 'avaliar_contrato' || fn2 === 'corrigir_avaliacao') {
      return wrap(null);
    }
    if (fn2 === 'responder_contrato' || fn === 'concluir_contrato' || fn === 'cancelar_contrato') {
      return wrap(null);
    }
    return wrap([]);
    };
    return rpcInterno(fn);
  },
};

export const testConnection = async () => true;
