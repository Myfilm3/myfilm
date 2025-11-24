'use client';

import { useEffect, useState } from 'react';
import Container from '@/components/layout/Container';
import {
  getEpisode,
  getTv,
  type EpisodeDetails,
  type TvDetails,
} from '@/lib/api';

// ================== helpers ==================

function parseEpisodePath(pathname: string) {
  // /series/66732/season/1/episode/1
  const parts = pathname.split('/').filter(Boolean);
  // ['series','66732','season','1','episode','1']
  const seriesIndex = parts.indexOf('series');

  if (seriesIndex === -1 || parts.length < seriesIndex + 6) {
    return { tvId: null, seasonNumber: null, episodeNumber: null };
  }

  const tvId = Number(parts[seriesIndex + 1]);
  const seasonNumber = Number(parts[seriesIndex + 3]);
  const episodeNumber = Number(parts[seriesIndex + 5]);

  if (
    !Number.isFinite(tvId) ||
    !Number.isFinite(seasonNumber) ||
    !Number.isFinite(episodeNumber)
  ) {
    return { tvId: null, seasonNumber: null, episodeNumber: null };
  }

  return { tvId, seasonNumber, episodeNumber };
}

function formatRuntime(mins?: number | null) {
  if (!mins || mins <= 0) return null;
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (!m) return `${h} h`;
  return `${h} h ${m} min`;
}

// ================== componente ==================

export default function EpisodePageClient() {
  const [episode, setEpisode] = useState<EpisodeDetails | null>(null);
  const [show, setShow] = useState<TvDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const { pathname } = window.location;
    const { tvId, seasonNumber, episodeNumber } = parseEpisodePath(pathname);

    if (!tvId || seasonNumber === null || episodeNumber === null) {
      setError('Episodio no encontrado.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [ep, tv] = await Promise.all([
          getEpisode(tvId, seasonNumber, episodeNumber),
          getTv(tvId),
        ]);

        if (cancelled) return;

        if (!ep) {
          setError('Episodio no encontrado.');
          setLoading(false);
          return;
        }

        setEpisode(ep);
        setShow(tv ?? null);
      } catch (e) {
        console.error('Error cargando el episodio', e);
        if (!cancelled) setError('Error cargando el episodio.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Container>
        <div className="min-h-[60vh] flex items-center justify-center text-white">
          Cargando episodio…
        </div>
      </Container>
    );
  }

  if (error || !episode) {
    return (
      <Container>
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-white gap-2">
          <p className="text-lg font-semibold">
            {error ?? 'Episodio no encontrado.'}
          </p>
        </div>
      </Container>
    );
  }

  const seriesName = show?.name || show?.original_name || null;
  const title = episode.name || `Episodio ${episode.episode_number}`;
  const still = episode.still_path
    ? `https://image.tmdb.org/t/p/w780${episode.still_path}`
    : null;
  const runtimeStr = formatRuntime(episode.runtime ?? null);
  const airDate = episode.air_date ?? null;

  return (
    <div className="relative min-h-screen text-white">
      <Container>
        <main className="py-10 max-w-5xl mx-auto space-y-8">
          {/* CABECERA SERIE + EPISODIO */}
          <header className="space-y-3">
            {seriesName && (
              <p className="text-xs sm:text-sm font-semibold text-amber-300 uppercase tracking-[0.15em]">
                {seriesName}
              </p>
            )}

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold">
              {title}
            </h1>

            <div className="flex flex-wrap gap-3 text-xs sm:text-sm text-slate-200/90">
              <span>
                T{episode.season_number} · E{episode.episode_number}
              </span>
              {airDate && <span>{airDate}</span>}
              {runtimeStr && <span>{runtimeStr}</span>}
            </div>
          </header>

          {/* BLOQUE PRINCIPAL: IMAGEN + INFO */}
          <section className="grid gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start">
            {/* Imagen grande del episodio */}
            {still && (
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/60">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={still}
                  alt={title}
                  className="w-full h-auto object-cover"
                />
              </div>
            )}

            {/* Info / sinopsis */}
            <div className="space-y-4">
              {episode.overview && (
                <section>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-300 mb-2">
                    Sinopsis
                  </h2>
                  <p className="text-sm md:text-base text-slate-100/90 leading-relaxed">
                    {episode.overview}
                  </p>
                </section>
              )}

              {/* Bloque de metadatos extra (placeholder para futuro) */}
              <section className="space-y-2 text-xs sm:text-sm text-slate-200/90">
                <h3 className="text-[0.7rem] font-semibold uppercase tracking-wide text-amber-300">
                  Detalles del episodio
                </h3>
                <ul className="space-y-1">
                  {runtimeStr && (
                    <li>
                      <span className="text-slate-300/80">Duración: </span>
                      {runtimeStr}
                    </li>
                  )}
                  {airDate && (
                    <li>
                      <span className="text-slate-300/80">Fecha de emisión: </span>
                      {airDate}
                    </li>
                  )}
                  {show?.genres && show.genres.length > 0 && (
                    <li>
                      <span className="text-slate-300/80">Géneros: </span>
                      {show.genres.map((g) => g.name).join(' · ')}
                    </li>
                  )}
                </ul>
              </section>
            </div>
          </section>
        </main>
      </Container>
    </div>
  );
}