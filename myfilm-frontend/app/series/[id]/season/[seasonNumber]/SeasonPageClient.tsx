'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Container from '@/components/layout/Container';
import { getSeason, type SeasonDetails } from '@/lib/api';

function parseSeasonPath(
  pathname: string,
): { tvId: number | null; seasonNumber: number | null } {
  // /series/66732/season/1
  const parts = pathname.split('/').filter(Boolean);
  // [ 'series', '66732', 'season', '1' ]
  const seriesIndex = parts.indexOf('series');

  if (seriesIndex === -1 || parts.length < seriesIndex + 4) {
    return { tvId: null, seasonNumber: null };
  }

  const tvId = Number(parts[seriesIndex + 1]);
  const seasonNumber = Number(parts[seriesIndex + 3]);

  if (!Number.isFinite(tvId) || !Number.isFinite(seasonNumber)) {
    return { tvId: null, seasonNumber: null };
  }

  return { tvId, seasonNumber };
}

export default function SeasonPageClient() {
  const router = useRouter();

  const [season, setSeason] = useState<SeasonDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const { pathname } = window.location;
    const { tvId, seasonNumber } = parseSeasonPath(pathname);

    if (!tvId || seasonNumber === null) {
      setError('Temporada no encontrada.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await getSeason(tvId, seasonNumber);

        if (cancelled) return;

        if (!data) {
          setError('Temporada no encontrada.');
          setLoading(false);
          return;
        }

        setSeason(data);
      } catch (e) {
        console.error('Error cargando la temporada', e);
        if (!cancelled) setError('Error cargando la temporada.');
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
          Cargando temporada…
        </div>
      </Container>
    );
  }

  if (error || !season) {
    return (
      <Container>
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-white gap-2">
          <p className="text-lg font-semibold">
            {error ?? 'Temporada no encontrada.'}
          </p>
        </div>
      </Container>
    );
  }

  const title =
    season.name || `Temporada ${season.season_number || ''}`.trim();
  const poster = season.poster_path
    ? `https://image.tmdb.org/t/p/w500${season.poster_path}`
    : null;

  // Volvemos a sacar el tvId para construir el link de cada episodio
  const { tvId } =
    typeof window !== 'undefined'
      ? parseSeasonPath(window.location.pathname)
      : { tvId: null }; // 👈 aquí estaba el problema, quitamos seasonNumber

  return (
    <div className="relative min-h-screen text-white">
      <Container>
        <main className="py-10 space-y-8">
          {/* Cabecera temporada */}
          <header className="flex flex-col md:flex-row gap-6">
            {poster && (
              <div className="w-[180px] shrink-0 rounded-xl overflow-hidden bg-black/40 border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={poster}
                  alt={title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="space-y-3">
              <h1 className="text-2xl md:text-3xl font-semibold">{title}</h1>
              {season.air_date && (
                <p className="text-sm text-slate-200/90">
                  Estrenada en {season.air_date}
                </p>
              )}
              {season.overview && (
                <p className="max-w-2xl text-sm md:text-base text-slate-100/90 leading-relaxed">
                  {season.overview}
                </p>
              )}
            </div>
          </header>

          {/* Lista de episodios */}
          {season.episodes && season.episodes.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Episodios</h2>
              <div className="flex flex-col gap-3">
                {season.episodes.map((ep) => {
                  const still = ep.still_path
                    ? `https://image.tmdb.org/t/p/w500${ep.still_path}`
                    : null;

                  const href =
                    tvId != null
                      ? `/series/${tvId}/season/${season.season_number}/episode/${ep.episode_number}`
                      : '#';

                  return (
                    <button
                      key={ep.id}
                      type="button"
                      onClick={() => tvId && router.push(href)}
                      className="text-left rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:bg-white/10 transition flex gap-4"
                    >
                      {still && (
                        <div className="relative w-40 md:w-52 aspect-video shrink-0 bg-black/40">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={still}
                            alt={ep.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="py-3 pr-3 flex-1 flex flex-col gap-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs text-slate-300">
                            Episodio {ep.episode_number}
                          </span>
                          <h3 className="text-sm md:text-base font-semibold">
                            {ep.name}
                          </h3>
                        </div>
                        {ep.overview && (
                          <p className="text-xs md:text-sm text-slate-100/85 line-clamp-3">
                            {ep.overview}
                          </p>
                        )}
                      </div>
                    </button>
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