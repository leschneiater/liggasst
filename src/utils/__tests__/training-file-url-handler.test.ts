// Teste de integracao do handler REAL da Edge Function training-file-url,
// com dependencias simuladas (auth, tabelas, storage). Sem Deno nem rede.
// O que so se confirma apos implantacao: comportamento do runtime Deno do
// Supabase, secrets e o caminho de rede ate o Storage.
import { describe, it, expect, vi } from 'vitest';
import { handleRequest } from '../../../supabase/functions/training-file-url/handler';

const PDF = '11111111-1111-1111-1111-111111111111.pdf';

const mkDeps = (opts: {
  user?: { id: string } | null;
  profile?: { role: string; verification_status: string; is_test?: boolean } | null;
  training?: { audience: string; status: string; pdf_path: string | null; is_test?: boolean } | null;
  signedUrl?: string;
  authError?: boolean;
}) => {
  const createSignedUrl = vi.fn().mockResolvedValue({ data: { signedUrl: opts.signedUrl ?? 'https://assinada.example/x.pdf' }, error: null });
  const singleProfile = vi.fn().mockResolvedValue({ data: opts.profile ?? null });
  const singleTraining = vi.fn().mockResolvedValue({ data: opts.training ?? null });
  const client = {
    auth: { getUser: vi.fn().mockResolvedValue(opts.authError
      ? { data: { user: null }, error: new Error('bad token') }
      : { data: { user: opts.user ?? null }, error: null }) },
    from: vi.fn((t: string) => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single: t === 'profiles' ? singleProfile : singleTraining })) })),
    })),
    storage: { from: vi.fn(() => ({ createSignedUrl })) },
  };
  return {
    deps: { supabaseUrl: 'https://proj.example', serviceRoleKey: 'k', createClient: () => client },
    espioes: { createSignedUrl, singleProfile, singleTraining, getUser: client.auth.getUser },
  };
};

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
  it('200 assina bucket trainings, path da linha e TTL 300 para membro no publico', async () => {
    const { deps, espioes } = mkDeps({
      user: { id: 'u1' },
      profile: { role: 'professional', verification_status: 'approved' },
      training: { audience: 'both', status: 'published', pdf_path: PDF },
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
  it('404 para membro real pedindo PDF de treinamento de teste', async () => {
    const { deps } = mkDeps({
      user: { id: 'u1' },
      profile: { role: 'professional', verification_status: 'approved' },
      training: { audience: 'both', status: 'published', pdf_path: PDF, is_test: true },
    });
    expect((await handleRequest(req({ training_id: 't-teste' }), deps)).status).toBe(404);
  });
  it('200 para membro DE TESTE pedindo PDF de treinamento de teste', async () => {
    const { deps, espioes } = mkDeps({
      user: { id: 'u-t' },
      profile: { role: 'professional', verification_status: 'approved', is_test: true },
      training: { audience: 'both', status: 'published', pdf_path: PDF, is_test: true },
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
});
