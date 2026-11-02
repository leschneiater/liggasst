// Recebe o formulario de Contato e GRAVA a mensagem. "ok" so volta depois que
// a gravacao foi confirmada. Nao guarda IP. Defesas: campo-isca, limites de
// tamanho, e-mail valido, limite por e-mail e limite geral por hora.
export interface DepsContato {
  contarRecentes: (email: string, desdeISO: string) => Promise<{ porEmail: number; total: number }>;
  inserir: (linha: LinhaContato) => Promise<{ ok: boolean }>;
  agora?: () => Date;
}
export interface LinhaContato {
  nome: string; email: string; telefone: string | null; empresa: string | null; assunto: string; mensagem: string;
}

export const LIMITE_POR_EMAIL_HORA = 3;
export const LIMITE_GERAL_HORA = 60;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: Record<string, unknown>, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS } });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const txt = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export const handleContato = async (req: Request, deps: DepsContato): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  let corpo: Record<string, unknown>;
  try { corpo = await req.json(); } catch { return json({ error: 'invalido' }, 400); }

  // Campo-isca: pessoas nao veem nem preenchem. Responde ok sem gravar.
  if (txt(corpo.site) !== '') return json({ ok: true }, 200);

  const linha: LinhaContato = {
    nome: txt(corpo.nome), email: txt(corpo.email).toLowerCase(),
    telefone: txt(corpo.telefone) || null, empresa: txt(corpo.empresa) || null,
    assunto: txt(corpo.assunto), mensagem: txt(corpo.mensagem),
  };
  const invalido =
    !linha.nome || linha.nome.length > 120 ||
    linha.email.length > 254 || !EMAIL_RE.test(linha.email) ||
    (linha.telefone !== null && linha.telefone.length > 30) ||
    (linha.empresa !== null && linha.empresa.length > 120) ||
    !linha.assunto || linha.assunto.length > 150 ||
    linha.mensagem.length < 10 || linha.mensagem.length > 4000;
  if (invalido) return json({ error: 'invalido' }, 400);

  const agora = (deps.agora ?? (() => new Date()))();
  const desde = new Date(agora.getTime() - 60 * 60 * 1000).toISOString();
  const { porEmail, total } = await deps.contarRecentes(linha.email, desde);
  if (porEmail >= LIMITE_POR_EMAIL_HORA || total >= LIMITE_GERAL_HORA) return json({ error: 'limite' }, 429);

  const r = await deps.inserir(linha);
  if (!r.ok) return json({ error: 'falha' }, 500);
  return json({ ok: true }, 200);
};
