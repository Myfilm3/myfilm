'use client';

import { useEffect, useMemo, useState } from 'react';
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
  const prevStep = useQVHStore((s) => s.prevStep);
  const reset = useQVHStore((s) => s.reset);

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

        setItems(json.results?.slice(0, 22) ?? []);
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

  return (
    <div className="py-10">
      <h2 className="text-3xl font-semibold">Esto es lo que te encaja hoy</h2>

      <div className="mt-4 flex gap-3">
        <button
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10"
          onClick={prevStep}
        >
          Atrás
        </button>
        <button
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10"
          onClick={reset}
        >
          Empezar de nuevo
        </button>
      </div>

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

      {!loading && !err && (
        <div className="mt-8 grid grid-cols-6 gap-4">
          {items.map((it) => {
            const title = it.title ?? it.name ?? 'Sin título';
            return (
              <div
                key={it.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-3"
              >
                <div className="text-sm font-semibold line-clamp-2">
                  {title}
                </div>
                <div className="text-xs opacity-60 mt-1">
                  {(it.release_date ?? it.first_air_date ?? '').slice(0, 4)}
                  {typeof it.vote_average === 'number' ? ` · ⭐ ${Math.round(it.vote_average * 10)}%` : ''}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Debug opcional */}
      <details className="mt-10 opacity-70">
        <summary className="cursor-pointer">Debug estado</summary>
        <pre className="text-xs mt-2">{JSON.stringify(state, null, 2)}</pre>
      </details>
    </div>
  );
}
