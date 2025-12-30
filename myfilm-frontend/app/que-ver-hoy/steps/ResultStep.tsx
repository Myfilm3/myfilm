'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Hero from '@/app/Hero';
import { useQVHStore } from '../store/qvh.store';
import { DOC_THEMES } from '../types';

type TMDBItem = {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  media_type?: 'movie' | 'tv';
};

const TMDB_BASE = 'https://api.themoviedb.org/3';

function assertTmdbKey(): string {
  const key = process.env.NEXT_PUBLIC_TMDB_KEY;
  if (!key) {
    throw new Error('Falta NEXT_PUBLIC_TMDB_KEY en .env.local');
  }
  return key;
}

export default function ResultStep() {
  const state = useQVHStore();

  const [items, setItems] = useState<TMDBItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const docThemeDef = useMemo(() => {
    if (state.type !== 'documentary' || !state.docTheme) return null;
    return DOC_THEMES.find((d) => d.key === state.docTheme) ?? null;
  }, [state.type, state.docTheme]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setErr(null);
      setLoading(true);
      setItems([]);

      try {
        const apiKey = assertTmdbKey();

        // Endpoint base
        const endpoint =
          state.type === 'series' ? 'discover/tv' : 'discover/movie';

        const params = new URLSearchParams({
          api_key: apiKey,
          language: 'es-ES',
          sort_by: 'popularity.desc',
          include_adult: 'false',
        });

        // Filtro por tiempo (pelis/series)
        if (state.type !== 'documentary' && state.time) {
          if (state.type === 'movie') {
            if (state.time === '<90') {
              params.set('with_runtime.lte', '90');
            } else if (state.time === '90-120') {
              params.set('with_runtime.gte', '90');
              params.set('with_runtime.lte', '120');
            } else if (state.time === '>120') {
              params.set('with_runtime.gte', '120');
            }
          }
          // En series runtime es más irregular; hoy lo dejamos sin runtime estricto
        }

        // Documentales: forzamos género "Documentary" (99) + (más tarde keywords)
        if (state.type === 'documentary') {
          params.set('with_genres', '99');

          // Tiempo doc simple
          if (state.docTime === '<40') {
            params.set('with_runtime.lte', '40');
          } else if (state.docTime === '>40') {
            params.set('with_runtime.gte', '40');
          }

          // Keywords (hoy vacío; mañana lo rellenas)
          if (docThemeDef?.tmdbKeywordIds?.length) {
            params.set('with_keywords', docThemeDef.tmdbKeywordIds.join(','));
          }
        }

        // NOTA: moods/context todavía no filtran, de momento solo lo mostramos en UI.
        const url = `${TMDB_BASE}/${endpoint}?${params.toString()}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`TMDB error ${res.status}`);

        const json: { results: TMDBItem[] } = await res.json();
        if (cancelled) return;

        const mediaType: 'movie' | 'tv' = state.type === 'series' ? 'tv' : 'movie';
        const enriched = (json.results ?? []).map((it) => ({
          ...it,
          media_type: mediaType,
        }));

        setItems(enriched.slice(0, 22));
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : 'Error desconocido';
        setErr(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [state.type, state.time, state.docTime, state.docTheme, docThemeDef?.tmdbKeywordIds]);

  const rest = items.slice(1);
  const heroItems = useMemo(
    () =>
      items
        .map((it) => ({
          ...it,
          media_type: it.media_type ?? (state.type === 'series' ? 'tv' : 'movie'),
        }))
        .slice(0, 1), // Solo una opción en el hero de resultados
    [items, state.type],
  );

  return (
    <div className="pb-16">
      {err && (
        <div className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm">
          {err}
          {err.includes('NEXT_PUBLIC_TMDB_KEY') && (
            <div className="opacity-70 mt-2">
              Revisa que exista <b>NEXT_PUBLIC_TMDB_KEY</b> en <b>.env.local</b> y reinicia el dev server.
            </div>
          )}
        </div>
      )}

      {loading && <div className="mt-6 opacity-70">Cargando resultados…</div>}

      {!loading && !err && heroItems.length > 0 && (
        <>
          <div className="relative" style={{ ['--nav-h' as any]: '96px' }}>
            <Hero items={heroItems} fullBleed />
          </div>

          {/* Carrusel de resto */}
          {rest.length > 0 && (
            <section className="-mt-16 md:-mt-100 space-y-3 px-4 md:px-8">
              <h4 className="text-lg font-semibold">Más que te pueden encajar</h4>
              <div className="flex justify-center">
                <div className="w-[90vw] max-w-6xl">
                  <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {rest.map((it) => {
                      const title = it.title ?? it.name ?? 'Sin título';
                      const poster = it.poster_path ?? it.backdrop_path ?? null;
                      const year =
                        (it.release_date ?? it.first_air_date ?? '').slice(0, 4) || '—';
                      const score =
                        typeof it.vote_average === 'number'
                          ? `${Math.round(it.vote_average * 10)}%`
                          : null;
                      return (
                        <div
                          key={it.id}
                          className="snap-start w-[160px] sm:w-[180px] shrink-0 rounded-2xl overflow-hidden border border-white/10 bg-white/5 shadow-[0_14px_36px_rgba(0,0,0,0.55)] transition"
                        >
                          <a href={state.type === 'series' ? `/series/${it.id}` : `/movies/${it.id}`}>
                            <div className="relative aspect-[2/3] bg-white/10">
                              {poster ? (
                                <Image
                                  src={`https://image.tmdb.org/t/p/w500${poster}`}
                                  alt={title}
                                  fill
                                  sizes="180px"
                                  className="object-cover"
                                  priority
                                />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-xs text-white/60">
                                  Sin imagen
                                </div>
                              )}
                            </div>
                            <div className="p-3 space-y-1">
                              <p className="text-sm font-semibold leading-tight line-clamp-2">
                                {title}
                              </p>
                              <p className="text-xs text-white/70">
                                {year}
                                {score ? ` · ⭐ ${score}` : ''}
                              </p>
                            </div>
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* Debug opcional */}
      <details className="mt-10 opacity-70">
        <summary className="cursor-pointer">Debug estado</summary>
        <pre className="text-xs mt-2">{JSON.stringify(state, null, 2)}</pre>
      </details>
    </div>
  );
}
