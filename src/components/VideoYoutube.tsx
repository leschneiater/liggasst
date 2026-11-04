import React from 'react';
import { ExternalLink } from 'lucide-react';
import { extrairYoutubeId, urlEmbedYoutube, urlAssistirYoutube } from '../utils/youtube';

// Player de YouTube incorporado com fallback de link direto. Se o autor
// desativou a incorporacao, o player mostra erro; o link sempre abre no
// YouTube. Links externos podem ser repassados por quem tiver acesso.
const VideoYoutube: React.FC<{ youtubeUrl: string; titulo: string }> = ({ youtubeUrl, titulo }) => {
  const id = extrairYoutubeId(youtubeUrl);
  if (!id) return null;
  return (
    <div>
      <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
        <iframe
          title={titulo}
          src={urlEmbedYoutube(id)}
          className="absolute inset-0 w-full h-full rounded-lg"
          loading="lazy"
          // Sem autoplay. Sem referrerPolicy no-referrer: o YouTube exige o
          // Referer para o embed (erro 153 caso contrario).
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
      <a
        href={urlAssistirYoutube(id)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center space-x-1 text-sm text-green-deep hover:underline"
      >
        <ExternalLink className="w-4 h-4" aria-hidden="true" />
        <span>Abrir no YouTube</span>
      </a>
    </div>
  );
};

export default VideoYoutube;
