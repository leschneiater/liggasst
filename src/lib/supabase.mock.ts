// Mock do cliente Supabase para o build E2E local (vite.e2e.config.ts).
// Simula sessao + leituras para o app REAL rodar sem backend.
// Papel escolhido pela querystring: ?role=admin|company|professional.
const params = new URLSearchParams(window.location.search);
const role = (params.get('role') ?? 'professional') as 'admin' | 'company' | 'professional';

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
  rpc: async () => ({ data: [], error: null }),
};

export const testConnection = async () => true;
