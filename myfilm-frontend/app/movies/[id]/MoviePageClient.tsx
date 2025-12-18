// app/movies/[id]/MoviePageClient.tsx
'use client';
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Container from '@/components/layout/Container';
import { getMovie, getTitleLogo, getTrailer, type MovieDetails } from '@/lib/api';

type Provider = {
  provider_id: number;
  provider_name: string;
  logo_path?: string | null;
};

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
  recommendations?: {
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

type MfbRecommendation = {
  tmdb_id?: number;
  score?: number;
  title?: string;
  original_title?: string;
  year?: number;
  vote_average?: number;
  popularity?: number;
  poster_path?: string | null;
  backdrop_path?: string | null;
  source_bucket?: string;
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
  const root = (movie as any)?.['watch/providers']?.results?.ES;
  if (!root) return [];

  const all: Provider[] = [
    ...(root.flatrate ?? []),
    ...(root.rent ?? []),
    ...(root.buy ?? []),
  ];

  const seen = new Set<number>();
  const out: Provider[] = [];
  for (const p of all) {
    if (!p?.provider_id || seen.has(p.provider_id)) continue;
    seen.add(p.provider_id);
    out.push(p);
  }
  return out.slice(0, 12);
}

/**
 * Normaliza NEXT_PUBLIC_API_BASE para evitar:
 * - faltarle /api
 * - tener doble /api/api
 */
function normalizeApiBase(raw?: string | null) {
  const base = (raw || '').trim();
  if (!base) return 'http://localhost:3001/api';

  const noSlash = base.endsWith('/') ? base.slice(0, -1) : base;

  if (noSlash.endsWith('/api/api')) return noSlash.replace(/\/api\/api$/, '/api');
  if (noSlash.endsWith('/api')) return noSlash;

  return `${noSlash}/api`;
}

/**
 * Fetch robusto:
 * - timeout
 * - captura body aunque no sea JSON
 * - intenta parsear JSON si procede
 */
async function fetchMfbRecommendations(url: string, timeoutMs = 9000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
      headers: { Accept: 'application/json,text/plain,*/*' },
    });

    const contentType = res.headers.get('content-type') || '';
    const rawBody = await res.text().catch(() => '');

    if (!res.ok) {
      return {
        ok: false as const,
        status: res.status,
        statusText: res.statusText,
        contentType,
        rawBody,
        results: [] as MfbRecommendation[],
      };
    }

    let json: any = null;
    try {
      json = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      json = null;
    }

    const parsed: MfbRecommendation[] = Array.isArray(json)
      ? (json as MfbRecommendation[])
      : (json?.results ?? []);

    return {
      ok: true as const,
      status: res.status,
      statusText: res.statusText,
      contentType,
      rawBody,
      results: Array.isArray(parsed) ? parsed : [],
    };
  } finally {
    clearTimeout(t);
  }
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

  // ✅ MYFILM (PRODUCCIÓN)
  const [mfbRecs, setMfbRecs] = useState<MfbRecommendation[]>([]);
  const [mfbError, setMfbError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isDev = process.env.NODE_ENV !== 'production';

  const tmdbId = useMemo(() => {
    const n = Number(rawId);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [rawId]);

  useEffect(() => {
    if (!rawId) {
      setError('ID de película no encontrado.');
      setLoading(false);
      return;
    }
    if (!tmdbId) {
      setError('ID de película no válido.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        setMfbError(null);
        setMfbRecs([]);

        const [movieData, logoUrl, trailerUrl] = await Promise.all([
          getMovie(tmdbId),
          getTitleLogo('movie', tmdbId),
          getTrailer('movie', tmdbId),
        ]);

        if (cancelled) return;

        if (!movieData) {
          setError('Película no encontrada.');
          return;
        }

        const fullMovie = movieData as MovieWithExtra;
        setMovie(fullMovie);
        setTitleLogo(logoUrl);
        setTrailer(trailerUrl);
        setProviders(getEsProviders(fullMovie));

        // 2) MFB (PRODUCCIÓN)
        const apiBase = normalizeApiBase(process.env.NEXT_PUBLIC_API_BASE);
        const urlMyfilm = `${apiBase}/mfb/recommendations/by-title?titleId=${tmdbId}&limit=22`;

        if (isDev) console.log('[MFB] Fetch MYFILM:', urlMyfilm);

        const rMyfilm = await fetchMfbRecommendations(urlMyfilm, 9000);

        if (cancelled) return;

        if (!rMyfilm.ok) {
          const snippet = (rMyfilm.rawBody || '').slice(0, 500);
          const msg = `MFB ${rMyfilm.status} ${rMyfilm.statusText} | ct=${rMyfilm.contentType || 'n/a'} | url=${urlMyfilm} | body=${snippet || '∅'}`;
          if (isDev) console.error('[MFB] ERROR:', msg);
          setMfbError(msg);
          setMfbRecs([]);
        } else {
          // OJO: no filtres en exceso aquí si quieres ver por qué vienen sin id.
          const results = (rMyfilm.results ?? []) as MfbRecommendation[];
          setMfbRecs(results);
          if (results.length === 0) setMfbError(`MFB OK pero 0 resultados | url=${urlMyfilm}`);
        }
      } catch (err: any) {
        if (cancelled) return;

        const msg =
          err?.name === 'AbortError'
            ? 'MFB timeout'
            : err instanceof Error
              ? err.message
              : 'Error desconocido';

        if (isDev) console.error('[MoviePageClient] EXCEPTION:', err);

        setError('Error cargando la película.');
        setMfbError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [rawId, tmdbId, isDev]);

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
          <p className="text-lg font-semibold">{error ?? 'Película no encontrada.'}</p>
          {isDev && mfbError && <p className="text-[11px] text-red-300/90">{mfbError}</p>}
        </div>
      </Container>
    );
  }

  const title = (movie as any).title || (movie as any).name || 'Sin título';
  const year = (movie as any).release_date?.slice(0, 4) ?? '—';
  const runtimeText = formatRuntime((movie as any).runtime ?? null);
  const score =
    typeof (movie as any).vote_average === 'number'
      ? Math.round((movie as any).vote_average * 10)
      : null;
  const genres = (movie as any).genres ?? [];

  const bgPath = (movie as any).backdrop_path || (movie as any).poster_path || null;
  const backgroundUrl = bgPath ? `https://image.tmdb.org/t/p/original${bgPath}` : null;

  const cast = movie.credits?.cast?.slice(0, 18) ?? [];
  const collection = movie.belongs_to_collection ?? null;

  const related =
    movie.similar?.results?.slice(0, 18) ??
    (movie as any).recommendations?.results?.slice(0, 18) ??
    [];

  // =====================================================
  // ✅ AJUSTES “DE DISEÑO” (los tocas aquí y listo)
  // =====================================================

  // 1) BAJAR / SUBIR TODO el contenido (en píxeles)
  //    - ejemplo: 0, 40, 80, 120...
  const CONTENT_TOP_PX = 500;

  // 2) EMPUJAR A LA IZQUIERDA (en rem)
  //    - sube/baja hasta que el inicio del contenido quede “donde está todo”
  //    - ejemplo: 0, 6, 8, 10, 12...
  const SHIFT_REM = 10;

  // =====================================================

  const layoutVars = {
    '--mf-shift': `${SHIFT_REM}rem`,
  } as React.CSSProperties;

  const HERO_SHIFT_CLASS = 'relative';
  const HERO_SHIFT_STYLE = { transform: 'translateX(calc(-1 * var(--mf-shift)))' } as React.CSSProperties;

  // Carrusel: empieza donde el HERO (izquierda) y se estira a la derecha hasta el borde del menú
  const ROW_STRETCH_STYLE = {
    marginLeft: 'calc(-1 * var(--mf-shift))',
    width: 'calc(100% + var(--mf-shift))',
  } as React.CSSProperties;

  return (
    <div className="relative min-h-screen text-white" style={layoutVars}>
      {backgroundUrl && (
        <div className="fixed inset-0 -z-10">
          <img src={backgroundUrl} alt={title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/10" />
        </div>
      )}

      <Container>
        <main className="pb-10 space-y-10" style={{ paddingTop: CONTENT_TOP_PX }}>
          {/* HERO */}
          <section className={`${HERO_SHIFT_CLASS} space-y-5 max-w-3xl`} style={HERO_SHIFT_STYLE}>
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
                  <span>{genres.map((g: any) => g.name).join(' · ')}</span>
                </>
              )}
            </div>

            {(movie as any).overview && (
              <p className="text-base sm:text-lg leading-relaxed text-white/85">
                {(movie as any).overview}
              </p>
            )}

            <div className="flex flex-wrap gap-3 pt-1">
              {trailer && (
                <a
                  href={trailer}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-full bg-amber-400 text-black px-6 py-2 text-sm font-semibold shadow-sm hover:bg-amber-300 transition"
                >
                  ▶️ Ver tráiler
                </a>
              )}
            </div>

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
            <section className={`${HERO_SHIFT_CLASS} space-y-2 max-w-3xl`} style={HERO_SHIFT_STYLE}>
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

          {/* ✅ REPARTO: empieza a la izquierda como el HERO y llega a la derecha hasta tu dedo */}
          {cast.length > 0 && (
            <section className="space-y-2" style={ROW_STRETCH_STYLE}>
              <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wide">
                Reparto principal
              </h2>

              <div className="flex gap-4 overflow-x-auto pb-3 pr-2">
                {cast.map((c, idx) => {
                  const key = c.credit_id ?? `${c.id}-${idx}`;
                  const img = c.profile_path
                    ? `https://image.tmdb.org/t/p/w342${c.profile_path}`
                    : null;

                  return (
                    <Link
                      key={key}
                      href={`/person/${c.id}`}
                      className="group relative min-w-[170px] max-w-[170px] rounded-lg overflow-hidden shadow-[0_10px_25px_rgba(0,0,0,0.6)] transform transition hover:-translate-y-1"
                      title={`${c.name}${c.character ? ` — ${c.character}` : ''}`}
                    >
                      {img ? (
                        <img
                          src={img}
                          alt={c.name}
                          className="w-full aspect-[2/3] object-cover transition-transform duration-200 group-hover:scale-[1.04]"
                        />
                      ) : (
                        <div className="w-full aspect-[2/3] flex items-center justify-center text-xs text-white/60 bg-black/40">
                          Sin foto
                        </div>
                      )}

                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute inset-0 bg-black/35" />
                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/85 via-black/40 to-transparent">
                          <div className="text-sm font-semibold text-amber-400 leading-tight line-clamp-2">
                            {c.name}
                          </div>
                          {c.character && (
                            <div className="mt-0.5 text-xs text-white/90 leading-snug line-clamp-2">
                              {c.character}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* 🔥 RELACIONADAS POR MYFILM: mismo inicio izquierda + llega derecha */}
          <section className="space-y-2" style={ROW_STRETCH_STYLE}>
            <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wide">
              Relacionadas por MYFILM
            </h2>

            {mfbRecs.length === 0 ? (
              <div className="space-y-1">
                <p className="text-xs text-white/70">
                  De momento no hay suficientes datos para recomendar similares.
                </p>
                {isDev && mfbError && (
                  <p className="text-[11px] text-red-300/90">Debug MFB: {mfbError}</p>
                )}
              </div>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-3 pr-2">
                {mfbRecs.map((r, idx) => {
                  const idForUrl = Number(r.tmdb_id ?? 0);
                  const displayTitle = r.title || r.original_title || 'Sin título';
                  const key = `${idForUrl || 'x'}-${idx}`;

                  // ✅ Si no hay id, NO hay Link (esto arregla el “no me envía”)
                  if (!Number.isFinite(idForUrl) || idForUrl <= 0) {
                    return (
                      <div
                        key={key}
                        className="min-w-[170px] max-w-[170px] rounded-lg overflow-hidden bg-black/40 border border-white/10"
                        title={`Sin tmdb_id | ${displayTitle}`}
                      >
                        <div className="aspect-[2/3] flex items-center justify-center text-xs text-white/60">
                          Sin id
                        </div>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={key}
                      href={`/movies/${idForUrl}`}
                      className="group min-w-[170px] max-w-[170px] rounded-lg overflow-hidden shadow-[0_10px_25px_rgba(0,0,0,0.6)] transform transition hover:-translate-y-1"
                      title={`${displayTitle} (${(r.score ?? 0).toFixed(3)})`}
                    >
                      {r.poster_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w342${r.poster_path}`}
                          alt={displayTitle}
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
            )}
          </section>

          {/* TMDB (si lo quieres mantener) */}
          {related.length > 0 && (
            <section className="space-y-2" style={ROW_STRETCH_STYLE}>
              <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wide">
                Películas similares que quizá te gusten
              </h2>

              <div className="flex gap-4 overflow-x-auto pb-3 pr-2">
                {related.map((m: any) => {
                  const href = m.media_type === 'tv' ? `/series/${m.id}` : `/movies/${m.id}`;
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
};