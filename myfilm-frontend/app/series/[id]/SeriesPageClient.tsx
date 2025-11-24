'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Container from '@/components/layout/Container';
import {
  getTv,
  getTitleLogo,
  getTrailer,
  getSeason,
  type TvDetails,
  type SeasonDetails,
} from '@/lib/api';
import PosterCard from '@/components/cards/PosterCard';

type Provider = {
  provider_id: number;
  provider_name: string;
  logo_path?: string | null;
};

function formatRuntimeFromArray(runtimes?: number[] | null): string | null {
  if (!runtimes || !runtimes.length) return null;
  const mins = runtimes[0];
  if (!mins || mins <= 0) return null;
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (!m) return `${h} h`;
  return `${h} h ${m} min`;
}

function getEsProviders(show: TvDetails): Provider[] {
  const root = show['watch/providers']?.results?.ES;
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

export default function SeriesPageClient() {
  const params = useParams();

  const rawId =
    typeof params?.id === 'string'
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : null;

  const [show, setShow] = useState<TvDetails | null>(null);
  const [titleLogo, setTitleLogo] = useState<string | null>(null);
  const [trailer, setTrailer] = useState<string | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [seasonNumber, setSeasonNumber] = useState<number | null>(null);
  const [season, setSeason] = useState<SeasonDetails | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carga básica de la serie
  useEffect(() => {
    if (!rawId) {
      setError('ID de serie no encontrado.');
      setLoading(false);
      return;
    }

    const tvId = Number(rawId);
    if (!Number.isFinite(tvId) || tvId <= 0) {
      setError('ID de serie no válido.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [data, logo, trailerUrl] = await Promise.all([
          getTv(tvId),
          getTitleLogo('tv', tvId),
          getTrailer('tv', tvId),
        ]);

        if (cancelled) return;

        if (!data) {
          setError('Serie no encontrada.');
          setLoading(false);
          return;
        }

        setShow(data);
        setTitleLogo(logo);
        setTrailer(trailerUrl);
        setProviders(getEsProviders(data));

        // temporada inicial → primera > 0 (evitar especiales)
        const firstSeason =
          data.seasons?.find((s) => s.season_number > 0) ??
          data.seasons?.[0] ??
          null;
        setSeasonNumber(firstSeason?.season_number ?? null);
      } catch (e) {
        console.error('Error cargando la serie', e);
        if (!cancelled) setError('Error cargando la serie.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [rawId]);

  // Carga de episodios de la temporada seleccionada
  useEffect(() => {
    if (!show || !seasonNumber) return;

    let cancelled = false;

    const loadSeason = async () => {
      try {
        const data = await getSeason(show.id, seasonNumber);
        if (!cancelled) setSeason(data);
      } catch (e) {
        console.error('Error cargando temporada', e);
        if (!cancelled) setSeason(null);
      }
    };

    loadSeason();
    return () => {
      cancelled = true;
    };
  }, [show?.id, seasonNumber]);

  if (loading) {
    return (
      <Container>
        <div className="min-h-[60vh] flex items-center justify-center text-white">
          Cargando serie…
        </div>
      </Container>
    );
  }

  if (error || !show) {
    return (
      <Container>
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-white gap-2">
          <p className="text-lg font-semibold">
            {error ?? 'Serie no encontrada.'}
          </p>
          <code className="text-xs bg-black/60 px-2 py-1 rounded border border-white/10">
            /series/&lt;id_tmdb_serie&gt;
          </code>
        </div>
      </Container>
    );
  }

  const title = show.name || show.original_name || 'Sin título';
  const year = show.first_air_date?.slice(0, 4) ?? '—';
  const genres = show.genres ?? [];
  const seasons = show.seasons ?? [];
  const runtime = formatRuntimeFromArray(show.episode_run_time ?? null);
  const score =
    typeof show.vote_average === 'number'
      ? Math.round(show.vote_average * 10)
      : null;

  const bgPath = show.backdrop_path || show.poster_path || null;
  const backgroundUrl = bgPath
    ? `https://image.tmdb.org/t/p/original${bgPath}`
    : null;

  const cast = show.credits?.cast ?? [];
  const topCast = cast.slice(0, 8);

  const similar =
    show.recommendations?.results?.length ||
    show.similar?.results?.length
      ? [
          ...(show.recommendations?.results ?? []),
          ...(show.similar?.results ?? []),
        ]
      : [];

  const creators = show.created_by ?? [];

  return (
    <div className="relative min-h-screen text-white">
      {/* FONDO */}
      {backgroundUrl && (
        <div className="fixed inset-0 -z-10">
          <img
            src={backgroundUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/90" />
        </div>
      )}

      <Container>
        <main className="py-10 space-y-10">
          {/* CABECERA */}
          <section className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <div className="space-y-4 max-w-2xl">
              {/* LOGO O TÍTULO */}
              {titleLogo ? (
                <div className="relative w-full max-w-md h-24 mb-2">
                  <img
                    src={titleLogo}
                    alt={title}
                    className="h-full w-auto object-contain drop-shadow-[0_0_25px_rgba(0,0,0,0.9)]"
                  />
                </div>
              ) : (
                <h1 className="text-4xl font-semibold text-white drop-shadow-lg">
                  {title}
                </h1>
              )}

              {/* METADATOS */}
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-100/90">
                {score !== null && (
                  <span className="px-3 py-1 rounded-full bg-amber-400/15 text-amber-300">
                    ★ {score}%
                  </span>
                )}
                <span>{year}</span>
                {runtime && <span>{runtime} por episodio</span>}
                {genres.length > 0 && (
                  <span className="truncate max-w-[260px]">
                    {genres.map((g) => g.name).join(' • ')}
                  </span>
                )}
              </div>

              {/* CREADORES */}
              {creators.length > 0 && (
                <p className="text-sm text-slate-100/90 mt-1">
                  Creado por{' '}
                  {creators.map((c) => c.name).join(', ')}
                </p>
              )}

              {/* OVERVIEW */}
              {show.overview && (
                <p className="text-base leading-relaxed text-slate-100/90 max-w-xl mt-3">
                  {show.overview}
                </p>
              )}

              {/* TRAILER */}
              {trailer && (
                <div className="mt-4">
                  <a
                    href={trailer}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center px-6 py-2 rounded-full bg-amber-400 text-black font-semibold text-sm hover:bg-amber-300 transition-colors"
                  >
                    ▶ Ver tráiler
                  </a>
                </div>
              )}
            </div>

            {/* LATERAL: PLATAFORMAS */}
            <div className="space-y-4 max-w-md ml-auto">
              {providers.length > 0 && (
                <div className="rounded-2xl bg-black/55 border border-white/10 p-4 backdrop-blur-md">
                  <h2 className="text-sm font-semibold text-slate-50 mb-3">
                    Disponible en:
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    {providers.map((p) => (
                      <div
                        key={p.provider_id}
                        className="px-3 py-2 rounded-xl bg-white text-black text-xs font-medium flex items-center gap-2 shadow-md shadow-black/40"
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
            </div>
          </section>

          {/* REPARTO PRINCIPAL */}
          {topCast.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Reparto principal</h2>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {topCast.map((actor) => (
                  <a
                    key={actor.id}
                    href={`/person/${actor.id}`}
                    className="flex-shrink-0 w-[110px] text-center"
                  >
                    <div className="relative w-[110px] h-[150px] rounded-2xl overflow-hidden bg-white/5 border border-white/10 mb-2">
                      {actor.profile_path && (
                        <img
                          src={`https://image.tmdb.org/t/p/w300${actor.profile_path}`}
                          alt={actor.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <p className="text-xs font-medium line-clamp-2">
                      {actor.name}
                    </p>
                    {actor.character && (
                      <p className="text-[11px] text-slate-300 line-clamp-1">
                        {actor.character}
                      </p>
                    )}
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* TEMPORADAS + EPISODIOS */}
          {seasons.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">Temporadas</h2>
                <select
                  className="bg-black/70 border border-white/20 rounded-full px-3 py-1 text-sm"
                  value={seasonNumber ?? ''}
                  onChange={(e) =>
                    setSeasonNumber(
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                >
                  {seasons
                    .filter((s) => s.season_number >= 0)
                    .map((s) => (
                      <option
                        key={s.id}
                        value={s.season_number}
                      >
                        {s.name || `Temporada ${s.season_number}`}
                      </option>
                    ))}
                </select>
              </div>

              {/* Episodios de la temporada seleccionada */}
              {season?.episodes && season.episodes.length > 0 && (
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {season.episodes.map((ep) => {
                    const still =
                      ep.still_path ||
                      show.backdrop_path ||
                      show.poster_path;
                    const imgSrc = still
                      ? `https://image.tmdb.org/t/p/w500${still}`
                      : undefined;

                    return (
                      <a
                        key={ep.id}
                        href={`/series/${show.id}/season/${season.season_number}/episode/${ep.episode_number}`}
                        className="flex-shrink-0 w-[260px]"
                      >
                        <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden bg-white/5 border border-white/10 mb-2">
                          {imgSrc && (
                            <img
                              src={imgSrc}
                              alt={ep.name}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <p className="text-sm font-medium line-clamp-2">
                          {ep.episode_number}. {ep.name}
                        </p>
                        {ep.overview && (
                          <p className="text-xs text-slate-300 line-clamp-2 mt-1">
                            {ep.overview}
                          </p>
                        )}
                      </a>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* SERIES SIMILARES / RECOMENDADAS */}
          {similar.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">
                Series similares que quizá te gusten
              </h2>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {similar.map((m) => (
                  <PosterCard
                    key={`${m.media_type || 'tv'}-${m.id}`}
                    id={m.id}
                    title={m.title || m.name || ''}
                    poster_path={m.poster_path}
                    backdrop_path={m.backdrop_path}
                    year={(m.release_date || m.first_air_date || '').slice(
                      0,
                      4,
                    )}
                    rating={m.vote_average}
                    href={`/series/${m.id}`}
                  />
                ))}
              </div>
            </section>
          )}
        </main>
      </Container>
    </div>
  );
}