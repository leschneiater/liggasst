// Validacao de URLs do YouTube para embed de treinamentos.
// So aceita hosts oficiais do YouTube; extrai o ID de 11 caracteres e
// constroi a URL de embed no dominio de privacidade aprimorada.
// Nunca incorpora HTML arbitrario nem URLs fora do YouTube.

const HOSTS_PERMITIDOS = new Set([
  'www.youtube.com',
  'youtube.com',
  'm.youtube.com',
  'youtu.be',
  'www.youtube-nocookie.com',
  'youtube-nocookie.com',
]);

const ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export const extrairYoutubeId = (url: string): string | null => {
  if (!url || typeof url !== 'string') return null;
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
  const host = parsed.hostname.toLowerCase();
  if (!HOSTS_PERMITIDOS.has(host)) return null;

  let candidato: string | null = null;
  if (host === 'youtu.be') {
    candidato = parsed.pathname.split('/').filter(Boolean)[0] ?? null;
  } else if (parsed.pathname === '/watch') {
    candidato = parsed.searchParams.get('v');
  } else {
    const partes = parsed.pathname.split('/').filter(Boolean);
    if (partes[0] === 'embed' || partes[0] === 'shorts' || partes[0] === 'live') {
      candidato = partes[1] ?? null;
    }
  }
  if (!candidato || !ID_PATTERN.test(candidato)) return null;
  return candidato;
};

export const urlEmbedYoutube = (id: string): string =>
  `https://www.youtube-nocookie.com/embed/${id}`;

export const urlAssistirYoutube = (id: string): string =>
  `https://www.youtube.com/watch?v=${id}`;
