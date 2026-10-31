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

interface Filtro { col: string; val: unknown }

const builder = (tabela: string) => {
  const filtros: Filtro[] = [];
  let singleMode: 'single' | 'maybeSingle' | null = null;
  const resolver = () => {
    let linhas: Record<string, unknown>[] = [];
    if (tabela === 'profiles') linhas = [profile as unknown as Record<string, unknown>];
    if (tabela === 'companies' || tabela === 'professionals') linhas = [{}];
    if (tabela === 'trainings') linhas = trainings as unknown as Record<string, unknown>[];
    for (const f of filtros) linhas = linhas.filter((l) => l[f.col] === f.val);
    if (singleMode) return { data: linhas[0] ?? null, error: null };
    return { data: linhas, error: null, count: linhas.length };
  };
  const q: Record<string, unknown> & { then?: unknown } = {};
  const chain = (nome: string) => (...args: unknown[]) => {
    if (nome === 'eq') filtros.push({ col: args[0] as string, val: args[1] });
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
