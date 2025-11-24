// app/movies/[id]/MoviePageClient.tsx
'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Container from '@/components/layout/Container';

import {
  getMovie,
  getTitleLogo,
  getTrailer,
  type MovieDetails,
} from '@/lib/api';

type Provider = {
  provider_id: number;
  provider_name: string;
  logo_path?: string | null;
};

/**
 * Extendemos MovieDetails localmente para evitar errores de TS
 * aunque en lib/api no estén todas las propiedades.
 */
type MovieWithExtra = MovieDetails & {
  belongs_to_collection?: {
    id: number;
    name: string;
    poster_path?: string | null;
    backdrop_path?: string | null;
  } | null;
  credits?: {
    cast?: Array<{
      id: number;
      name: string;
      character?: string | null;
      profile_path?: string | null;
      credit_id?: string;
    }>;
  };
  similar?: {
    results?: Array<{
      id: number;
      title?: string;
      name?: string;
      poster_path?: string | null;
      backdrop_path?: string | null;
      vote_average?: number;
      media_type?: 'movie' | 'tv';
      release_date?: string;
      first_air_date?: string;
    }>;
  };
};

function formatRuntime(mins?: number | null): string | null {
  if (!mins || mins <= 0) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (!h) return `${m} min`;
  if (!m) return `${h} h`;
  return `${h} h ${m} min`;
}

function getEsProviders(movie: MovieWithExtra): Provider[] {
  const root = movie['watch/providers']?.results?.ES;
  if (!root) return [];
  const all: Provider[] = [
    ...(root.flatrate ?? []),
    ...(root.rent ?? []),
    ...(root.buy ?? []),
  ];
  const seen = new Set<number>();
  const out: Provider[] = [];
  for (const p of all) {
    if (!p.provider_id || seen.has(p.provider_id)) continue;
    seen.add(p.provider_id);
    out.push(p);
  }
  return out.slice(0, 12);
}

export default function MoviePageClient() {
  const params = useParams();

  const rawId =
    typeof params?.id === 'string'
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : null;

  const [movie, setMovie] = useState<MovieWithExtra | null>(null);
  const [titleLogo, setTitleLogo] = useState<string | null>(null);
  const [trailer, setTrailer] = useState<string | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!rawId) {
      setError('ID de película no encontrado.');
      setLoading(false);
      return;
    }

    const tmdbId = Number(rawId);
    if (!Number.isFinite(tmdbId) || tmdbId <= 0) {
      setError('ID de película no válido.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [movieData, logoUrl, trailerUrl] = await Promise.all([
          getMovie(tmdbId),
          getTitleLogo('movie', tmdbId),
          getTrailer('movie', tmdbId),
        ]);

        if (cancelled) return;

        if (!movieData) {
          setError('Película no encontrada.');
          setLoading(false);
          return;
        }

        const fullMovie = movieData as MovieWithExtra;
        setMovie(fullMovie);
        setTitleLogo(logoUrl);
        setTrailer(trailerUrl);
        setProviders(getEsProviders(fullMovie));
      } catch (err: unknown) {
        console.error('Error cargando la película', err);
        if (!cancelled) setError('Error cargando la película.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [rawId]);

  if (loading) {
    return (
      <Container>
        <div className="min-h-[60vh] flex items-center justify-center text-white/80 text-sm">
          Cargando película…
        </div>
      </Container>
    );
  }

  if (error || !movie) {
    return (
      <Container>
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-white/90 gap-3">
          <p className="text-lg font-semibold">
            {error ?? 'Película no encontrada.'}
          </p>
        </div>
      </Container>
    );
  }

  // ---- Datos ----
  const title = movie.title || movie.name || 'Sin título';
  const year = movie.release_date?.slice(0, 4) ?? '—';
  const runtimeText = formatRuntime(movie.runtime ?? null);
  const score =
    typeof movie.vote_average === 'number'
      ? Math.round(movie.vote_average * 10)
      : null;
  const genres = movie.genres ?? [];

  const bgPath = movie.backdrop_path || movie.poster_path || null;
  const backgroundUrl = bgPath
    ? `https://image.tmdb.org/t/p/original${bgPath}`
    : null;

  const cast = movie.credits?.cast?.slice(0, 12) ?? [];
  const collection = movie.belongs_to_collection ?? null;

  const related =
    movie.similar?.results?.slice(0, 18) ??
    movie.recommendations?.results?.slice(0, 18) ??
    [];

  return (
    <div className="relative min-h-screen text-white">
      {/* Fondo detrás del menú */}
      {backgroundUrl && (
        <div className="fixed inset-0 -z-10">
          <img
            src={backgroundUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/10" />
        </div>
      )}

      <Container>
        <main className="py-10 space-y-10">
          {/* HERO */}
          <section className="space-y-5 max-w-3xl">
            {titleLogo ? (
              <div className="relative w-full max-w-xl h-24">
                <img
                  src={titleLogo}
                  alt={title}
                  className="h-full w-auto object-contain drop-shadow-[0_0_25px_rgba(0,0,0,0.9)]"
                />
              </div>
            ) : (
              <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight drop-shadow-lg">
                {title}
              </h1>
            )}

            {/* Metadatos */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-white/85">
              {score !== null && (
                <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
                  ★ {score}%
                </span>
              )}
              <span>{year}</span>
              {runtimeText && (
                <>
                  <span className="text-white/50">•</span>
                  <span>{runtimeText}</span>
                </>
              )}
              {genres.length > 0 && (
                <>
                  <span className="text-white/50">•</span>
                  <span>{genres.map((g) => g.name).join(' · ')}</span>
                </>
              )}
            </div>

            {/* Sinopsis */}
            {movie.overview && (
              <p className="text-base sm:text-lg leading-relaxed text-white/85">
                {movie.overview}
              </p>
            )}

            {/* CTA / Tráiler */}
            <div className="flex flex-wrap gap-3 pt-1">
              {trailer && (
                <a
                  href={trailer}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-full bg-amber-400 text-black px-6 py-2 text-sm font-semibold shadow-sm hover:bg-amber-300 transition"
                >
                  ▶ Ver tráiler
                </a>
              )}
            </div>

            {/* Disponible en */}
            {providers.length > 0 && (
              <div className="pt-4 space-y-2">
                <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wide">
                  Disponible en
                </h2>
                <div className="flex flex-wrap gap-3">
                  {providers.map((p) => (
                    <div
                      key={p.provider_id}
                      className="flex items-center gap-2 rounded-full bg-white text-black px-4 py-2 text-xs font-medium shadow-sm"
                    >
                      {p.logo_path && (
                        <img
                          src={`https://image.tmdb.org/t/p/w200${p.logo_path}`}
                          alt={p.provider_name}
                          className="h-5 w-auto object-contain"
                        />
                      )}
                      <span>{p.provider_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* COLECCIÓN */}
          {collection && (
            <section className="space-y-2 max-w-3xl">
              <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wide">
                Colección
              </h2>

              <Link
                href={`/collection/${collection.id}`}
                className="flex gap-4 items-center rounded-lg bg-black/50 border border-white/10 p-4 hover:bg-black/70 transition-colors"
              >
                {(collection.backdrop_path || collection.poster_path) && (
                  <img
                    src={`https://image.tmdb.org/t/p/w500${
                      collection.backdrop_path ?? collection.poster_path
                    }`}
                    alt={collection.name}
                    className="h-24 w-auto rounded-md object-cover flex-shrink-0"
                  />
                )}

                <div>
                  <p className="text-sm font-medium">{collection.name}</p>
                  <p className="text-xs text-white/70 mt-1">
                    Ver todas las películas de esta saga.
                  </p>
                </div>
              </Link>
            </section>
          )}

          {/* Reparto principal (clicable a personas) */}
          {cast.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wide">
                Reparto principal
              </h2>

              <div className="flex gap-4 overflow-x-auto pb-3">
                {cast.map((c) => (
                  <Link
                    key={c.credit_id ?? `${c.id}-${c.name}`}
                    href={`/person/${c.id}`}
                    className="min-w-[120px] max-w-[120px] text-center group"
                  >
                    <div className="w-24 h-24 mx-auto mb-2 rounded-full overflow-hidden border border-white/20">
                      <img
                        src={
                          c.profile_path
                            ? `https://image.tmdb.org/t/p/w185${c.profile_path}`
                            : '/no-face.png'
                        }
                        alt={c.name}
                        className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform"
                      />
                    </div>
                    <div className="text-xs font-medium truncate">{c.name}</div>
                    {c.character && (
                      <div className="mt-0.5 text-[0.7rem] text-white/70 line-clamp-2">
                        {c.character}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Relacionadas */}
          {related.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wide">
                Películas similares que quizá te gusten
              </h2>

              <div className="flex gap-4 overflow-x-auto pb-3">
                {related.map((m) => {
                  const href =
                    m.media_type === 'tv'
                      ? `/series/${m.id}`
                      : `/movies/${m.id}`;

                  return (
                    <Link
                      key={m.id}
                      href={href}
                      className="group min-w-[170px] max-w-[170px] rounded-lg overflow-hidden shadow-[0_10px_25px_rgba(0,0,0,0.6)] transform transition hover:-translate-y-1"
                    >
                      {m.poster_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w342${m.poster_path}`}
                          alt={m.title || m.name || 'Sin título'}
                          className="w-full h-auto object-cover transition-transform duration-200 group-hover:scale-[1.04]"
                        />
                      ) : (
                        <div className="aspect-[2/3] flex items-center justify-center text-xs text-white/60 bg-black/40">
                          Sin póster
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </main>
      </Container>
    </div>
  );
}
