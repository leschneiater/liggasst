// Validacao de link externo generico de treinamento: somente http/https.
// O link e sempre aberto em nova aba; nunca embed nem HTML arbitrario.
export const linkExternoValido = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};
