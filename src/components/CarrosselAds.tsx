// Carrossel de anuncios do plano GRATUITO (decisao dela 04/11):
// aparece so nas areas logadas de contas free; assinante pago e
// visitante nunca veem. Banners, ordem, tempo por arte e maximo de
// artes vem do painel admin; clique conta via RPC e abre o link (se
// houver) em nova aba.
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePlanoFree } from '../hooks/usePlanoFree';
import { AdBanner, adImagemUrl, fetchAdsConfig, fetchBannersAtivos, registrarCliqueAd } from '../services/ads';

const CarrosselAds: React.FC = () => {
  const { currentUser } = useAuth();
  const free = usePlanoFree();
  const [banners, setBanners] = useState<AdBanner[]>([]);
  const [intervalo, setIntervalo] = useState(5);
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    if (!currentUser || !free) { setBanners([]); return; }
    let vivo = true;
    (async () => {
      try {
        const cfg = await fetchAdsConfig();
        const lista = await fetchBannersAtivos(cfg.max_ativos);
        if (!vivo) return;
        setIntervalo(cfg.intervalo_segundos);
        setBanners(lista);
      } catch {
        if (vivo) setBanners([]);
      }
    })();
    return () => { vivo = false; };
  }, [currentUser, free]);

  useEffect(() => {
    if (banners.length < 2) return;
    const t = setInterval(() => setIndice((i) => (i + 1) % banners.length), intervalo * 1000);
    return () => clearInterval(t);
  }, [banners.length, intervalo]);

  if (!currentUser || !free || banners.length === 0) return null;
  const banner = banners[indice % banners.length];

  const clicar = () => {
    void registrarCliqueAd(banner.id);
    if (banner.link) window.open(banner.link, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="mb-8" data-testid="carrossel-ads">
      <button
        type="button"
        onClick={clicar}
        aria-label={`Anúncio: ${banner.titulo}`}
        className="block w-full rounded-2xl shadow-md overflow-hidden bg-white hover:shadow-lg transition-shadow"
      >
        <img
          src={adImagemUrl(banner.imagem_path)}
          alt={banner.titulo}
          className="w-full h-32 sm:h-40 object-cover"
        />
      </button>
      {banners.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2" aria-hidden="true">
          {banners.map((b, i) => (
            <span
              key={b.id}
              className={`h-1.5 rounded-full transition-all ${i === indice % banners.length ? 'w-4 bg-green-deep' : 'w-1.5 bg-gray-300'}`}
            />
          ))}
        </div>
      )}
      <p className="text-right text-xs text-gray-400 mt-1">Publicidade</p>
    </div>
  );
};

export default CarrosselAds;
