'use client';

import { useEffect, useState } from 'react';
import Container from '@/components/layout/Container';
import { getSeason, type SeasonDetails } from '@/lib/api';

// Parsea rutas del estilo:
// /series/66732/season/1
function parseSeasonPath(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);

  // ['series','66732','season','1']
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
  const [{ tvId, seasonNumber }, setParams] = useState<{
    tvId: number | null;
    seasonNumber: number | null;
  }>({ tvId: null, seasonNumber: null });

  const [season, setSeason] = useState<SeasonDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lee la URL SOLO en cliente
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const parsed = parseSeasonPath(window.location.pathname);
    setParams(parsed);
  }, []);

  // Cargar datos cuando tengamos tvId y seasonNumber
  useEffect(() => {
    if (!tvId || !seasonNumber) return;

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
        if (!cancelled) setError('Error cargando la temporada.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [tvId, seasonNumber]);

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
        <div className="min-h-[60vh] flex items-center justify-center text-white">
          {error ?? 'Temporada no encontrada.'}
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <main className="py-10 space-y-6">
        <h1 className="text-3xl font-semibold">
          Temporada {season.season_number}
        </h1>

        <p className="text-white/80 max-w-3xl">
          {season.overview || 'Sin descripción.'}
        </p>

        <h2 className="text-xl font-semibold mt-6">Episodios</h2>

        <div className="space-y-4">
          {season.episodes?.map((ep) => (
            <div
              key={ep.id}
              className="rounded-lg bg-white/5 p-4 border border-white/10"
            >
              <a
                href={`/series/${tvId}/season/${seasonNumber}/episode/${ep.episode_number}`}
                className="text-lg font-medium hover:text-amber-400 transition"
              >
                {ep.episode_number}. {ep.name}
              </a>
            </div>
          ))}
        </div>
      </main>
    </Container>
  );
}
