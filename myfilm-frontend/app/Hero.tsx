'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import { getTitleLogo, getTrailer } from '@/lib/api';

type HeroItem = {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  backdrop_path?: string | null;
  poster_path?: string | null;
  media_type?: 'movie' | 'tv';
};

type Props = {
  items: HeroItem[];
  fullBleed?: boolean;
};

export default function Hero({ items, fullBleed = true }: Props) {
  // Solo 10 items máximo
  const pool = useMemo(
    () => (items ?? []).filter(Boolean).slice(0, 10),
    [items],
  );

  const [idx, setIdx] = useState(0);
  const current = pool[idx] ?? null;

  const [loadedId, setLoadedId] = useState<number | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);
  const [showTrailer, setShowTrailer] = useState(false);

  // Navegación manual
  const goPrev = () => {
    if (!pool.length) return;
    setIdx((i) => (i - 1 + pool.length) % pool.length);
  };

  const goNext = () => {
    if (!pool.length) return;
    setIdx((i) => (i + 1) % pool.length);
  };

  // Cargar logo + tráiler cada vez que cambia el item
  useEffect(() => {
    if (!current) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    // Reset asíncrono para contentar al linter
    setTimeout(() => {
      if (cancelled) return;
      setLoadedId(null);
      setLogoUrl(null);
      setTrailerUrl(null);
      setShowTrailer(false);
    }, 0);

    const mediaType: 'movie' | 'tv' =
      current.media_type === 'tv' ? 'tv' : 'movie';

    (async () => {
      try {
        const [logo, trailer] = await Promise.all([
          getTitleLogo(mediaType, current.id).catch(() => null),
          getTrailer(mediaType, current.id).catch(() => null),
        ]);

        if (cancelled) return;

        setLogoUrl(logo ?? null);
        setTrailerUrl(trailer ?? null);

        if (trailer) {
          timer = setTimeout(() => {
            if (!cancelled) setShowTrailer(true);
          }, 5000); // 5 segundos
        }
      } catch {
        if (!cancelled) {
          setLogoUrl(null);
          setTrailerUrl(null);
          setShowTrailer(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [current]);

  if (!current) return null;

  const title = current.title || current.name || 'Sin título';
  const bg = current.backdrop_path || current.poster_path;
  const src = bg
    ? `https://image.tmdb.org/t/p/original${bg}`
    : '/legacy/images/placeholder-hero.jpg';

  const wrapper = fullBleed
    ? 'relative w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]'
    : '';

  // Construye la URL del iframe con autoplay/mute
  const iframeSrc =
    trailerUrl && !trailerUrl.includes('?')
      ? `${trailerUrl}?autoplay=1&mute=1&controls=0&rel=0&playsinline=1&modestbranding=1&showinfo=0`
      : trailerUrl || undefined;

  return (
    <div className={wrapper}>
      <section
        aria-label={`Hero: ${title}`}
        className="relative w-full overflow-hidden bg-[#040D19]"
        style={{
          height: '100svh',
          marginTop: 'calc(var(--nav-h, 0px) * -1.25)',
          paddingTop: 'var(--nav-h, 0px)',
        }}
      >
        {/* Fondo imagen */}
        <Image
          key={`${current.id}-${src}`}
          src={src}
          alt={title}
          fill
          priority
          sizes="100vw"
          onLoadingComplete={() => setLoadedId(current.id)}
          className={`object-cover transition-opacity duration-700 ${
            loadedId === current.id ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Tráiler a pantalla completa */}
        {showTrailer && iframeSrc && (
          <div className="absolute inset-0">
            <iframe
              src={iframeSrc}
              title="Trailer"
              className="w-full h-full"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {/* Gradientes */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#040D19]/80 via-[#040D19]/20 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-black/60 via-black/25 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#040D19] via-[#040D19]/70 to-transparent" />

        {/* Texto + botones */}
        <div className="absolute inset-0 flex items-end pointer-events-none">
          <div className="px-6 md:px-10 lg:px-14 pb-20 md:pb-24 lg:pb-28 max-w-[70ch] pointer-events-auto">
            {logoUrl ? (
              <div className="relative w-[320px] max-w-[60vw] h-[120px]">
                <Image
                  src={logoUrl}
                  alt={title}
                  fill
                  className="object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
                />
              </div>
            ) : (
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white drop-shadow-[0_6px_24px_rgba(0,0,0,0.35)]">
                {title}
              </h1>
            )}

            {current.overview && (
              <p className="mt-3 text-base md:text-lg text-white/90 max-w-2xl line-clamp-3 md:line-clamp-4 drop-shadow-md">
                {current.overview}
              </p>
            )}

            <div className="mt-6 flex items-center gap-3">
              <Button onClick={() => console.log('play', current.id)}>
                Reproducir
              </Button>
              <Button
                variant="ghost"
                onClick={() => console.log('mas-info', current.id)}
              >
                Más información
              </Button>
            </div>
          </div>
        </div>

        {/* Flechas laterales */}
        {pool.length > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="Anterior"
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 flex items-center justify-center text-white text-2xl"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Siguiente"
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 flex items-center justify-center text-white text-2xl"
            >
              ›
            </button>
          </>
        )}
      </section>
    </div>
  );
}