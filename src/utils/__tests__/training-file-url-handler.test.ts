// Teste de integracao do handler REAL da Edge Function training-file-url,
// com dependencias simuladas (auth, tabelas, storage). Sem Deno nem rede.
// O que so se confirma apos implantacao: comportamento do runtime Deno do
// Supabase, secrets e o caminho de rede ate o Storage.
import { describe, it, expect, vi } from 'vitest';
import { handleRequest } from '../../../supabase/functions/training-file-url/handler';

const PDF = '11111111-1111-1111-1111-111111111111.pdf';

type SubOpts = { plan: string; status: string; current_period_end: string | null; environment: string } | null;

const mkDeps = (opts: {
  user?: { id: string } | null;
  profile?: { role: string; verification_status: string; is_test?: boolean } | null;
  training?: { audience: string; status: string; pdf_path: string | null; is_test?: boolean } | null;
  secao?: { content_type: string; conteudo: string | null; trails: { kind: string; published: boolean; audience: string; is_test?: boolean } | null } | null;
  subscription?: SubOpts;
  signedUrl?: string;
  authError?: boolean;
  acessoEquipe?: boolean;
}) => {
  const createSignedUrl = vi.fn().mockResolvedValue({ data: { signedUrl: opts.signedUrl ?? 'https://assinada.example/x.pdf' }, error: null });
  const singleProfile = vi.fn().mockResolvedValue({ data: opts.profile ?? null });
  const singleTraining = vi.fn().mockResolvedValue({ data: opts.training ?? null });
  const singleSecao = vi.fn().mockResolvedValue({ data: opts.secao ?? null });
  const maybeSingleSub = vi.fn().mockResolvedValue({ data: opts.subscription ?? null });
  const client = {
    auth: { getUser: vi.fn().mockResolvedValue(opts.authError
      ? { data: { user: null }, error: new Error('bad token') }
      : { data: { user: opts.user ?? null }, error: null }) },
    from: vi.fn((t: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => (t === 'subscriptions'
          ? { single: singleProfile, maybeSingle: maybeSingleSub }
          : { single: t === 'profiles' ? singleProfile : t === 'trail_sections' ? singleSecao : singleTraining, maybeSingle: maybeSingleSub })),
      })),
    })),
    storage: { from: vi.fn(() => ({ createSignedUrl })) },
    rpc: vi.fn().mockResolvedValue({ data: opts.acessoEquipe ?? false, error: null }),
  };
  return {
    deps: { supabaseUrl: 'https://proj.example', serviceRoleKey: 'k', createClient: () => client },
    espioes: { createSignedUrl, singleProfile, singleTraining, singleSecao, maybeSingleSub, getUser: client.auth.getUser },
  };
};

// Assinatura paga valida (pro ativo em producao) para os cenarios de membro
// que esperam 200: sem ela o gate da Capacitacao nega acesso.
const PAGA: SubOpts = { plan: 'pro_professional', status: 'active', current_period_end: null, environment: 'production' };

const req = (body: unknown, comAuth = true) =>
  new Request('https://fn.example/training-file-url', {
    method: 'POST',
    headers: comAuth ? { Authorization: 'Bearer token-ok' } : {},
    body: JSON.stringify(body),
  });

describe('handler training-file-url (integracao com deps simuladas)', () => {
  it('OPTIONS responde CORS sem autenticacao', async () => {
    const { deps } = mkDeps({});
    const r = await handleRequest(new Request('https://fn.example', { method: 'OPTIONS' }), deps);
    expect(r.status).toBe(200);
    expect(r.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
  it('401 sem header Authorization', async () => {
    const { deps } = mkDeps({});
    const r = await handleRequest(req({ training_id: 't1' }, false), deps);
    expect(r.status).toBe(401);
  });
  it('401 com token rejeitado', async () => {
    const { deps } = mkDeps({ authError: true });
    expect((await handleRequest(req({ training_id: 't1' }), deps)).status).toBe(401);
  });
  it('400 sem training_id', async () => {
    const { deps } = mkDeps({ user: { id: 'u1' } });
    expect((await handleRequest(req({}), deps)).status).toBe(400);
    expect((await handleRequest(req({ training_id: 42 }), deps)).status).toBe(400);
  });
  it('403 para perfil nao aprovado', async () => {
    const { deps } = mkDeps({
      user: { id: 'u1' },
      profile: { role: 'professional', verification_status: 'pending' },
      training: { audience: 'both', status: 'published', pdf_path: PDF },
    });
    expect((await handleRequest(req({ training_id: 't1' }), deps)).status).toBe(403);
  });
  it('403 para papel fora do publico', async () => {
    const { deps } = mkDeps({
      user: { id: 'u1' },
      profile: { role: 'company', verification_status: 'approved' },
      training: { audience: 'professional', status: 'published', pdf_path: PDF },
    });
    expect((await handleRequest(req({ training_id: 't1' }), deps)).status).toBe(403);
  });
  it('403 para rascunho (PDF apos despublicar) e 404 para ID inexistente', async () => {
    const { deps } = mkDeps({
      user: { id: 'u1' },
      profile: { role: 'professional', verification_status: 'approved' },
      training: { audience: 'both', status: 'draft', pdf_path: PDF },
    });
    expect((await handleRequest(req({ training_id: 't1' }), deps)).status).toBe(403);
    const d2 = mkDeps({ user: { id: 'u1' }, profile: { role: 'professional', verification_status: 'approved' }, training: null });
    expect((await handleRequest(req({ training_id: 'inexistente' }), d2.deps)).status).toBe(404);
  });
  it('200 assina bucket trainings, path da linha e TTL 300 para membro PAGANTE no publico', async () => {
    const { deps, espioes } = mkDeps({
      user: { id: 'u1' },
      profile: { role: 'professional', verification_status: 'approved' },
      training: { audience: 'both', status: 'published', pdf_path: PDF },
      subscription: PAGA,
      signedUrl: 'https://assinada.example/ok.pdf',
    });
    const r = await handleRequest(req({ training_id: 't1' }), deps);
    expect(r.status).toBe(200);
    const corpo = await r.json();
    expect(corpo.signedUrl).toBe('https://assinada.example/ok.pdf');
    expect(corpo.expiresIn).toBe(300);
    expect(espioes.getUser).toHaveBeenCalledWith('token-ok');
    expect(espioes.createSignedUrl).toHaveBeenCalledWith(PDF, 300);
  });
  it('admin assina PDF de rascunho', async () => {
    const { deps } = mkDeps({
      user: { id: 'admin' },
      profile: { role: 'admin', verification_status: 'approved' },
      training: { audience: 'company', status: 'draft', pdf_path: PDF },
    });
    expect((await handleRequest(req({ training_id: 't1' }), deps)).status).toBe(200);
  });
  it('404 para membro real PAGANTE pedindo PDF de treinamento de teste', async () => {
    const { deps } = mkDeps({
      user: { id: 'u1' },
      profile: { role: 'professional', verification_status: 'approved' },
      training: { audience: 'both', status: 'published', pdf_path: PDF, is_test: true },
      subscription: PAGA,
    });
    expect((await handleRequest(req({ training_id: 't-teste' }), deps)).status).toBe(404);
  });
  it('200 para membro DE TESTE pagante pedindo PDF de treinamento de teste', async () => {
    const { deps, espioes } = mkDeps({
      user: { id: 'u-t' },
      profile: { role: 'professional', verification_status: 'approved', is_test: true },
      training: { audience: 'both', status: 'published', pdf_path: PDF, is_test: true },
      subscription: PAGA,
    });
    const r = await handleRequest(req({ training_id: 't-teste' }), deps);
    expect(r.status).toBe(200);
    expect(espioes.createSignedUrl).toHaveBeenCalledWith(PDF, 300);
  });
  it('200 para admin pedindo PDF de treinamento de teste', async () => {
    const { deps } = mkDeps({
      user: { id: 'adm' },
      profile: { role: 'admin', verification_status: 'approved' },
      training: { audience: 'company', status: 'draft', pdf_path: PDF, is_test: true },
    });
    expect((await handleRequest(req({ training_id: 't-teste' }), deps)).status).toBe(200);
  });
  it('403 para membro GRATUITO (sem assinatura) pedindo PDF', async () => {
    const { deps, espioes } = mkDeps({
      user: { id: 'u1' },
      profile: { role: 'professional', verification_status: 'approved' },
      training: { audience: 'both', status: 'published', pdf_path: PDF },
    });
    const r = await handleRequest(req({ training_id: 't1' }), deps);
    expect(r.status).toBe(403);
    expect(espioes.createSignedUrl).not.toHaveBeenCalled();
  });
  it('403 para assinatura paga de SANDBOX (nao libera acesso real)', async () => {
    const { deps } = mkDeps({
      user: { id: 'u1' },
      profile: { role: 'professional', verification_status: 'approved' },
      training: { audience: 'both', status: 'published', pdf_path: PDF },
      subscription: { plan: 'pro_professional', status: 'active', current_period_end: null, environment: 'sandbox' },
    });
    expect((await handleRequest(req({ training_id: 't1' }), deps)).status).toBe(403);
  });
  it('403 para cancelado FORA do periodo pago e 200 dentro dele', async () => {
    const base = {
      user: { id: 'u1' },
      profile: { role: 'professional', verification_status: 'approved' },
      training: { audience: 'both' as const, status: 'published' as const, pdf_path: PDF },
    };
    const fora = mkDeps({ ...base, subscription: { plan: 'pro_professional', status: 'canceled', current_period_end: '2020-01-01', environment: 'production' } });
    expect((await handleRequest(req({ training_id: 't1' }), fora.deps)).status).toBe(403);
    const dentro = mkDeps({ ...base, subscription: { plan: 'pro_professional', status: 'canceled', current_period_end: '2999-01-01', environment: 'production' } });
    expect((await handleRequest(req({ training_id: 't1' }), dentro.deps)).status).toBe(200);
  });
  it('200 para ADMIN sem plano pago (gerencia o conteudo)', async () => {
    const { deps } = mkDeps({
      user: { id: 'adm' },
      profile: { role: 'admin', verification_status: 'approved' },
      training: { audience: 'both', status: 'published', pdf_path: PDF },
    });
    expect((await handleRequest(req({ training_id: 't1' }), deps)).status).toBe(200);
  });
  // Funcionario (feature 3): o plano conferido e o da empresa via RPC
  // equipe_treinamento_acesso; a propria assinatura do employee nao existe.
  it('funcionario com atribuicao da empresa pagante recebe 200', async () => {
    const { deps } = mkDeps({
      user: { id: 'f1' },
      profile: { role: 'employee', verification_status: 'approved' },
      training: { audience: 'company', status: 'published', pdf_path: PDF },
      acessoEquipe: true,
    });
    expect((await handleRequest(req({ training_id: 't1' }), deps)).status).toBe(200);
  });
  it('funcionario SEM atribuicao recebe 403', async () => {
    const { deps } = mkDeps({
      user: { id: 'f1' },
      profile: { role: 'employee', verification_status: 'approved' },
      training: { audience: 'company', status: 'published', pdf_path: PDF },
      acessoEquipe: false,
    });
    expect((await handleRequest(req({ training_id: 't1' }), deps)).status).toBe(403);
  });
});

describe('handler training-file-url: ramo trail_section_id (Etapa 2)', () => {
  const PERFIL_OK = { role: 'professional', verification_status: 'approved', is_test: false };
  const SECAO_OK = {
    content_type: 'pdf',
    conteudo: '22222222-2222-2222-2222-222222222222.pdf',
    trails: { kind: 'open', published: true, audience: 'professional', is_test: false },
  };

  it('pagante abre PDF de secao de trilha open publicada', async () => {
    const { deps } = mkDeps({ user: { id: 'u1' }, profile: PERFIL_OK, secao: SECAO_OK, subscription: PAGA });
    const r = await handleRequest(req({ trail_section_id: 's1' }), deps);
    expect(r.status).toBe(200);
    const corpo = await r.json();
    expect(corpo.signedUrl).toContain('https://');
  });

  it('conta gratuita recebe 403', async () => {
    const { deps } = mkDeps({ user: { id: 'u1' }, profile: PERFIL_OK, secao: SECAO_OK, subscription: null });
    const r = await handleRequest(req({ trail_section_id: 's1' }), deps);
    expect(r.status).toBe(403);
  });

  it('trilha certified ainda nao entrega conteudo (etapa futura)', async () => {
    const { deps } = mkDeps({
      user: { id: 'u1' }, profile: PERFIL_OK, subscription: PAGA,
      secao: { ...SECAO_OK, trails: { ...SECAO_OK.trails!, kind: 'certified' } },
    });
    const r = await handleRequest(req({ trail_section_id: 's1' }), deps);
    expect(r.status).toBe(403);
  });

  it('rascunho de trilha nao entrega para membro', async () => {
    const { deps } = mkDeps({
      user: { id: 'u1' }, profile: PERFIL_OK, subscription: PAGA,
      secao: { ...SECAO_OK, trails: { ...SECAO_OK.trails!, published: false } },
    });
    const r = await handleRequest(req({ trail_section_id: 's1' }), deps);
    expect(r.status).toBe(403);
  });

  it('trilha de teste responde 404 para membro real', async () => {
    const { deps } = mkDeps({
      user: { id: 'u1' }, profile: PERFIL_OK, subscription: PAGA,
      secao: { ...SECAO_OK, trails: { ...SECAO_OK.trails!, is_test: true } },
    });
    const r = await handleRequest(req({ trail_section_id: 's1' }), deps);
    expect(r.status).toBe(404);
  });

  it('secao youtube nao tem PDF para assinar', async () => {
    const { deps } = mkDeps({
      user: { id: 'u1' }, profile: PERFIL_OK, subscription: PAGA,
      secao: { content_type: 'youtube', conteudo: 'https://www.youtube.com/watch?v=x', trails: SECAO_OK.trails },
    });
    const r = await handleRequest(req({ trail_section_id: 's1' }), deps);
    expect(r.status).toBe(404);
  });

  it('admin abre PDF de rascunho (gestao)', async () => {
    const { deps } = mkDeps({
      user: { id: 'adm' },
      profile: { role: 'admin', verification_status: 'approved' },
      subscription: null,
      secao: { ...SECAO_OK, trails: { ...SECAO_OK.trails!, published: false } },
    });
    const r = await handleRequest(req({ trail_section_id: 's1' }), deps);
    expect(r.status).toBe(200);
  });

  it('secao inexistente responde 404', async () => {
    const { deps } = mkDeps({ user: { id: 'u1' }, profile: PERFIL_OK, subscription: PAGA, secao: null });
    const r = await handleRequest(req({ trail_section_id: 'sX' }), deps);
    expect(r.status).toBe(404);
  });

  it('ramo de treinamento continua funcionando (regressao)', async () => {
    const { deps } = mkDeps({
      user: { id: 'u1' }, profile: PERFIL_OK, subscription: PAGA,
      training: { audience: 'professional', status: 'published', pdf_path: PDF, is_test: false },
    });
    const r = await handleRequest(req({ training_id: 't1' }), deps);
    expect(r.status).toBe(200);
  });
});
