'use client';

import { useEffect, useMemo, useState, MouseEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  getTitleLogo,
  getTrailer,
  getMovie,
  getTv,
  type MovieDetails,
  type TvDetails,
} from '@/lib/api';

type HeroItem = {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  backdrop_path?: string | null;
  poster_path?: string | null;
  media_type?: 'movie' | 'tv';
  vote_average?: number;
};

type Props = {
  items: HeroItem[];
  fullBleed?: boolean;
};

type MetaState = {
  ageLabel: string | null;
  runtimeLabel: string | null;
};

// Extendemos tipos solo para las partes de ratings que necesitamos
type MovieWithRatings = MovieDetails & {
  release_dates?: {
    results?: {
      iso_3166_1?: string;
      release_dates?: { certification?: string | null }[];
    }[];
  };
};

type TvWithRatings = TvDetails & {
  content_ratings?: {
    results?: {
      iso_3166_1?: string;
      rating?: string | null;
    }[];
  };
};

export default function Hero({ items, fullBleed = true }: Props) {
  const router = useRouter();

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
  const [meta, setMeta] = useState<MetaState>({
    ageLabel: null,
    runtimeLabel: null,
  });

  const goPrev = (e: MouseEvent) => {
    e.stopPropagation();
    if (!pool.length) return;
    setIdx((i) => (i - 1 + pool.length) % pool.length);
  };

  const goNext = (e: MouseEvent) => {
    e.stopPropagation();
    if (!pool.length) return;
    setIdx((i) => (i + 1) % pool.length);
  };

  useEffect(() => {
    if (!current) return;

    let cancelled = false;
    let resetTimeout: ReturnType<typeof setTimeout> | null = null;
    let trailerTimeout: ReturnType<typeof setTimeout> | null = null;

    // Reset asíncrono para contentar al linter
    resetTimeout = setTimeout(() => {
      if (cancelled) return;
      setLoadedId(null);
      setLogoUrl(null);
      setTrailerUrl(null);
      setShowTrailer(false);
      setMeta({ ageLabel: null, runtimeLabel: null });
    }, 0);

    const mediaType: 'movie' | 'tv' =
      current.media_type === 'tv' ? 'tv' : 'movie';

    (async () => {
      try {
        const [logo, trailer, details] = await Promise.all([
          getTitleLogo(mediaType, current.id).catch(() => null),
          getTrailer(mediaType, current.id).catch(() => null),
          mediaType === 'movie'
            ? getMovie(current.id).catch(() => null)
            : getTv(current.id).catch(() => null),
        ]);

        if (cancelled) return;

        setLogoUrl(logo ?? null);
        setTrailerUrl(trailer ?? null);

        // ====== edad mínima + duración reales ======
        let ageLabel: string | null = null;
        let runtimeLabel: string | null = null;

        if (details) {
          if (mediaType === 'movie') {
            const movie = details as MovieWithRatings;

            // duración
            if (typeof movie.runtime === 'number' && movie.runtime > 0) {
              const mins = movie.runtime;
              const h = Math.floor(mins / 60);
              const m = mins % 60;
              runtimeLabel =
                h > 0
                  ? `${h}h ${m.toString().padStart(2, '0')}min`
                  : `${m}min`;
            }

            // edad mínima desde release_dates
            const rd = movie.release_dates?.results ?? [];
            const pickCountry = (code: string) =>
              rd.find(
                (r) =>
                  r.iso_3166_1 === code &&
                  (r.release_dates?.length ?? 0) > 0,
              );
            const countryBlock =
              pickCountry('ES') || pickCountry('US') || rd[0];

            const cert =
              countryBlock?.release_dates?.find(
                (x) =>
                  (x.certification ?? '').trim().length > 0,
              )?.certification ?? '';

            if (cert) {
              ageLabel = `${cert}+`;
            }
          } else {
            const tv = details as TvWithRatings;

            // duración: primer runtime de episodio
            const er = tv.episode_run_time ?? [];
            if (er.length && er[0] > 0) {
              const mins = er[0];
              const h = Math.floor(mins / 60);
              const m = mins % 60;
              runtimeLabel =
                h > 0
                  ? `${h}h ${m.toString().padStart(2, '0')}min`
                  : `${m}min`;
            }

            // edad desde content_ratings
            const cr = tv.content_ratings?.results ?? [];
            const pickCountry = (code: string) =>
              cr.find(
                (r) =>
                  r.iso_3166_1 === code &&
                  (r.rating ?? '').trim().length > 0,
              );
            const ratingBlock =
              pickCountry('ES') || pickCountry('US') || cr[0];

            const cert = ratingBlock?.rating ?? '';

            if (cert) {
              ageLabel = `${cert}+`;
            }
          }
        }

        setMeta({ ageLabel, runtimeLabel });

        if (trailer) {
          trailerTimeout = setTimeout(() => {
            if (!cancelled) setShowTrailer(true);
          }, 10000);
        }
      } catch {
        if (!cancelled) {
          setLogoUrl(null);
          setTrailerUrl(null);
          setShowTrailer(false);
          setMeta({ ageLabel: null, runtimeLabel: null });
        }
      }
    })();

    return () => {
      cancelled = true;
      if (resetTimeout) clearTimeout(resetTimeout);
      if (trailerTimeout) clearTimeout(trailerTimeout);
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

  const iframeSrc =
    trailerUrl && !trailerUrl.includes('?')
      ? `${trailerUrl}?autoplay=1&mute=1&controls=0&rel=0&playsinline=1&modestbranding=1&showinfo=0`
      : trailerUrl || undefined;

  const rating = current.vote_average;
  const ratingLabel = rating ? rating.toFixed(1) : null;

  const goToDetails = () => {
    const type = current.media_type === 'tv' ? 'series' : 'movies';
    router.push(`/${type}/${current.id}`);
  };

  return (
    <div className={wrapper}>
      <section
        aria-label={`Hero: ${title}`}
        className="relative w-full overflow-hidden bg-[#040D19] cursor-pointer"
        style={{
          height: '100svh',
          marginTop: 'calc(var(--nav-h, 0px) * -1.25)',
          paddingTop: 'var(--nav-h, 0px)',
        }}
        onClick={goToDetails}
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

        {/* Tráiler */}
        {showTrailer && iframeSrc && (
          <div className="absolute inset-0 pointer-events-none">
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

        {/* Bloque de texto */}
        <div className="absolute inset-0 flex items-center">
          <div className="px-6 md:px-10 lg:px-14 max-w-[70ch] translate-y-[-5vh]">
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

            {/* Chips: valoración / edad / duración */}
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm md:text-base text-white/90">
              {ratingLabel && (
                <span className="inline-flex items-center rounded-full border border-white/40 bg-black/50 px-3 py-1">
                  ⭐ <span className="ml-1">{ratingLabel}</span>
                </span>
              )}

              {meta.ageLabel && (
                <span className="inline-flex items-center rounded-full border border-white/40 bg-black/50 px-3 py-1">
                  {meta.ageLabel}
                </span>
              )}

              {meta.runtimeLabel && (
                <span className="inline-flex items-center rounded-full border border-white/40 bg-black/50 px-3 py-1">
                  {meta.runtimeLabel}
                </span>
              )}
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