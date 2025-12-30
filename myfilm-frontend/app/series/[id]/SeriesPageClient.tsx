'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useParams } from 'next/navigation';
import Container from '@/components/layout/Container';
import { getTv, getTitleLogo, getTrailer, getSeason, type TvDetails, type SeasonDetails } from '@/lib/api';
import PosterCard from '@/components/cards/PosterCard';

type Provider = {
  provider_id: number;
  provider_name: string;
  logo_path?: string | null;
  type?: 'sub' | 'rent' | 'buy';
};

type MfbRecommendation = {
  tmdb_id?: number;
  title?: string;
  original_title?: string;
  year?: number;
  vote_average?: number;
  popularity?: number;
  poster_path?: string | null;
  backdrop_path?: string | null;
};

const EXCLUDED_PROVIDER_MARKERS = [
  'netflixstandardwithads',
  'netflixstandardconanuncios',
  'movistarficciontotal',
  'movistarplusficciontotal',
  'primevideochannels',
  'primevideochannel',
  'amazonprimevideochannels',
  'primechannels',
];

const EXCLUDED_PROVIDER_IDS = new Set([51, 81, 82]);

const PLATFORM_LOGOS: Record<string, string> = {
  netflix: '/legacy/images/plataformas/netflix.png',
  disney: '/legacy/images/plataformas/disney.png',
  disneyplus: '/legacy/images/plataformas/disney.png',
  prime: '/legacy/images/plataformas/prime.png',
  primevideo: '/legacy/images/plataformas/prime.png',
  amazonprimevideo: '/legacy/images/plataformas/prime.png',
  amazon: '/legacy/images/plataformas/prime.png',
  apple: '/legacy/images/plataformas/apple.png',
  appletv: '/legacy/images/plataformas/apple.png',
  appletvplus: '/legacy/images/plataformas/apple.png',
  movistar: '/legacy/images/plataformas/movistar.png',
  movistarplus: '/legacy/images/plataformas/movistar.png',
  movistarplusplus: '/legacy/images/plataformas/movistar.png',
  hbo: '/legacy/images/plataformas/hbo.png',
  hbomax: '/legacy/images/plataformas/hbomax.png',
  max: '/legacy/images/plataformas/hbomax.png',
  skyshowtime: '/legacy/images/plataformas/skyshowtime.png',
  filmin: '/legacy/images/plataformas/filmin.png',
  flixole: '/legacy/images/plataformas/flixole.png',
  mitele: '/legacy/images/plataformas/mitele.png',
  crunchyroll: '/legacy/images/plataformas/crunchy.png',
  crunchy: '/legacy/images/plataformas/crunchy.png',
  amc: '/legacy/images/plataformas/amc.png',
  paramount: '/legacy/images/plataformas/paramount.png',
  paramountplus: '/legacy/images/plataformas/paramount.png',
  rakuten: '/legacy/images/plataformas/rakuten.png',
  rakutentv: '/legacy/images/plataformas/rakutentv.png',
  pluto: '/legacy/images/plataformas/pluto.png',
  plutotv: '/legacy/images/plataformas/pluto.png',
  atresplayer: '/legacy/images/plataformas/atres.png',
  rtve: '/legacy/images/plataformas/rtve.png',
  rtveplay: '/legacy/images/plataformas/rtveplay.png',
  tivify: '/legacy/images/plataformas/tivify.png',
  mubi: '/legacy/images/plataformas/mubi.png',
  crunchyfunimation: '/legacy/images/plataformas/crunchy.png',
  lionsgate: '/legacy/images/plataformas/lionsgate.png',
  lionsgateplay: '/legacy/images/plataformas/lionsgate.png',
  lionsgateplus: '/legacy/images/plataformas/lionsgate.png',
  lionsgateamazonchannels: '/legacy/images/plataformas/lionsgate.png',
  lionsgateamazonchannel: '/legacy/images/plataformas/lionsgate.png',
  starzplay: '/legacy/images/plataformas/lionsgate.png',
  starz: '/legacy/images/plataformas/lionsgate.png',
};

const SEARCH_ALIASES: Record<string, string> = {
  amazonprimevideo: 'prime',
  primevideo: 'prime',
  amazon: 'prime',
  amazonvideo: 'prime',
  ama: 'prime',
  disneyplus: 'disney',
  'disney+': 'disney',
  appletv: 'apple',
  'appletv+': 'apple',
  movistarplus: 'movistar',
  hbomax: 'max',
  'hbo max': 'max',
  plutotv: 'pluto',
  'pluto tv': 'pluto',
  paramountplus: 'paramount',
  'paramount+': 'paramount',
  rakutentv: 'rakutentv',
  'rakuten tv': 'rakutentv',
  skyshowtime: 'skyshowtime',
  flixolé: 'flixole',
  lionsgateplay: 'lionsgate',
  lionsgateplus: 'lionsgate',
  lionsgateamazonchannels: 'lionsgate',
  lionsgateamazonchannel: 'lionsgate',
  lionsgateplusamazonchannels: 'lionsgate',
  starzplay: 'lionsgate',
};

function normalizeProviderName(name?: string | null) {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function canonicalProviderKey(name: string) {
  const norm = normalizeProviderName(name);
  if (!norm) return null;
  const compact = norm.replace(/[ .+]/g, '');
  const alias = SEARCH_ALIASES[compact];
  return alias ?? compact;
}

function buildSearchUrl(key: string | null, title: string, year?: string | null) {
  if (!key) return null;
  const q = encodeURIComponent([title, year ?? ''].join(' ').trim());
  switch (key) {
    case 'netflix':
      return `https://www.netflix.com/search?q=${q}`;
    case 'disney':
      return `https://www.disneyplus.com/search?q=${q}`;
    case 'prime':
      return `https://www.primevideo.com/search?phrase=${q}`;
    case 'apple':
      return `https://tv.apple.com/es/search?term=${q}`;
    case 'max':
    case 'hbo':
      return `https://play.max.com/search?q=${q}`;
    case 'movistar':
      return `https://ver.movistarplus.es/busqueda?query=${q}`;
    case 'filmin':
      return `https://www.filmin.es/buscar?q=${q}`;
    case 'flixole':
      return `https://flixole.com/buscar?query=${q}`;
    case 'skyshowtime':
      return `https://www.skyshowtime.com/es/es/search?q=${q}`;
    case 'atresplayer':
      return `https://www.atresplayer.com/buscador/?q=${q}`;
    case 'rtve':
      return `https://www.rtve.es/play/buscador/?q=${q}`;
    case 'pluto':
      return `https://pluto.tv/es/search?query=${q}`;
    case 'plex':
      return `https://watch.plex.tv/search?q=${q}`;
    case 'paramount':
      return `https://www.paramountplus.com/search/?q=${q}`;
    case 'rakutentv':
      return `https://www.rakuten.tv/es/search?query=${q}`;
    case 'mubi':
      return `https://mubi.com/es/films?query=${q}`;
    case 'crunchyroll':
      return `https://www.crunchyroll.com/search?from=&q=${q}`;
    case 'mitele':
      return `https://www.mitele.es/buscar/?q=${q}`;
    case 'tivify':
      return `https://app.tivify.tv/search?q=${q}`;
    default:
      return null;
  }
}

function shouldExcludeProvider(provider?: Provider | null) {
  if (provider?.provider_id && EXCLUDED_PROVIDER_IDS.has(provider.provider_id))
    return true;
  const normalized = normalizeProviderName(provider?.provider_name);
  if (!normalized) return false;
  if (EXCLUDED_PROVIDER_MARKERS.some((m) => normalized.includes(m))) return true;
  if (normalized.includes('channel') && normalized.includes('prime')) return true;
  if (normalized.includes('amazonchannel')) return true;
  if (normalized.includes('hbomaxamazon')) return true;
  return false;
}

function getCustomProviderLogo(name?: string | null) {
  const key = normalizeProviderName(name);
  if (!key) return null;
  return PLATFORM_LOGOS[key] ?? null;
}

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

function getEsProviders(show: TvDetails): { sub: Provider[]; rent: Provider[]; buy: Provider[] } {
  const root = show['watch/providers']?.results?.ES;
  if (!root) return { sub: [], rent: [], buy: [] };
  const subs: Provider[] = [...(root.flatrate ?? [])].map((p) => ({ ...p, type: 'sub' }));
  const rent: Provider[] = [...(root.rent ?? [])].map((p) => ({ ...p, type: 'rent' }));
  const buy: Provider[] = [...(root.buy ?? [])].map((p) => ({ ...p, type: 'buy' }));

  const seen = new Set<number>();
  const dedupe = (list: Provider[]) =>
    list.filter((p) => {
      if (!p?.provider_id || seen.has(p.provider_id)) return false;
      if (shouldExcludeProvider(p)) return false;
      seen.add(p.provider_id);
      return true;
    });

  return {
    sub: dedupe(subs).slice(0, 12),
    rent: dedupe(rent).slice(0, 12),
    buy: dedupe(buy).slice(0, 12),
  };
}

function normalizeApiBase(raw?: string | null) {
  if (!raw) return '';
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
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
  const [mfbRecs, setMfbRecs] = useState<MfbRecommendation[]>([]);
  const [seasonNumber, setSeasonNumber] = useState<number | null>(null);
  const [season, setSeason] = useState<SeasonDetails | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const providerGroups = useMemo(() => {
    if (!show) return { sub: [] as Provider[], rent: [] as Provider[], buy: [] as Provider[] };
    return getEsProviders(show);
  }, [show]);

  // Config base API + shift (ajusta estos valores para mover todo el bloque principal)
  const SHIFT_X_REM = -5; // mueve a la izquierda (positivo) o derecha (negativo)
  const SHIFT_Y_REM = 30; // mueve hacia abajo todo el contenido (en rem)
  const apiBase = normalizeApiBase(process.env.NEXT_PUBLIC_API_BASE);
  const ROW_EXTRA_RIGHT_REM = 16; // amplía anchura a la derecha para que los carruseles ocupen más
  const MAIN_EXTRA_RIGHT_REM = 12; // ensancha todo el bloque principal hacia la derecha

  const layoutVars = useMemo(
    () =>
      ({
        '--mf-shift': `${SHIFT_X_REM}rem`,
      } as CSSProperties),
    [SHIFT_X_REM],
  );

  const ROW_STRETCH_STYLE = useMemo(
    () =>
      ({
        marginLeft: `-${SHIFT_X_REM}rem`,
        width: `calc(100% + ${SHIFT_X_REM}rem + ${ROW_EXTRA_RIGHT_REM}rem)`,
        paddingRight: `${ROW_EXTRA_RIGHT_REM}rem`,
      } as CSSProperties),
    [SHIFT_X_REM, ROW_EXTRA_RIGHT_REM],
  );

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

  const title = show?.name || show?.original_name || 'Sin título';
  const year = show?.first_air_date?.slice(0, 4) ?? '—';
  const genres = show?.genres ?? [];
  const seasons = show?.seasons ?? [];
  const runtime = formatRuntimeFromArray(show?.episode_run_time ?? null);
  const score =
    typeof show?.vote_average === 'number' ? Math.round(show.vote_average * 10) : null;
  const titleForSearch = show?.name || show?.original_name || '';

  const bgPath = show?.backdrop_path || show?.poster_path || null;
  const backgroundUrl = bgPath ? `https://image.tmdb.org/t/p/original${bgPath}` : null;

  const cast = show?.credits?.cast ?? [];
  const topCast = cast.slice(0, 8);

  const similar =
    show?.recommendations?.results?.length || show?.similar?.results?.length
      ? [
          ...(show?.recommendations?.results ?? []),
          ...(show?.similar?.results ?? []),
        ]
      : [];

  const creators = show?.created_by ?? [];

  const displayProviders = useMemo(() => {
    const build = (base: Provider[]) => {
      const map = new Map<
        string,
        {
          name: string;
          logoSrc: string | null;
          href: string | null;
          key: string | null;
        }
      >();

      const keyFor = (name?: string | null) => {
        const canon = name ? canonicalProviderKey(name) : null;
        const norm = name ? normalizeProviderName(name) : null;
        return canon || norm || null;
      };

      for (const p of base) {
        if (shouldExcludeProvider(p)) continue;
        const key = keyFor(p.provider_name);
        const mapKey = key || normalizeProviderName(p.provider_name) || p.provider_name;
        if (!mapKey || map.has(mapKey)) continue;

        const customLogo = getCustomProviderLogo(p.provider_name);
        const fallbackLogo = p.logo_path
          ? `https://image.tmdb.org/t/p/w200${p.logo_path}`
          : null;
        const logoSrc = customLogo ?? fallbackLogo;

        const searchUrl = buildSearchUrl(key, titleForSearch, year);

        map.set(mapKey, {
          name: p.provider_name,
          logoSrc,
          href: searchUrl ?? '#',
          key,
        });
      }

      return Array.from(map.values());
    };

    return {
      sub: build(providerGroups.sub),
      rent: build(providerGroups.rent),
      buy: build(providerGroups.buy),
    };
  }, [providerGroups, titleForSearch, year]);

  const renderProviderGrid = (
    items: Array<{ name: string; logoSrc: string | null; href: string | null; key: string | null }>,
  ) => (
    <div className="flex flex-wrap gap-4">
      {items.map((p, idx) => {
        const logoSrc = p.logoSrc;
        const link = p.href || '#';
        const card = (
          <div
            key={p.key ?? `${p.name}-${idx}`}
            className="relative overflow-hidden rounded-2xl border border-white/20 bg-black/30 shadow-[0_12px_30px_rgba(0,0,0,0.4)] backdrop-blur-sm"
            style={{ width: 200, height: 70 }}
          >
            {logoSrc ? (
              <>
                <img
                  src={logoSrc}
                  alt={p.name}
                  className="w-full h-full object-cover"
                  style={{ filter: 'saturate(1.05)' }}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/30" />
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-white/80 bg-white/10">
                {p.name.slice(0, 3).toUpperCase()}
              </div>
            )}
          </div>
        );

        return (
          <a
            key={`${p.name}-${idx}`}
            href={link}
            target="_blank"
            rel="noreferrer"
            className="group"
            aria-label={`Ver en ${p.name}`}
          >
            <div className="relative">
              {card}
              <div className="absolute inset-0 rounded-2xl ring-0 ring-amber-300/0 group-hover:ring-2 group-hover:ring-amber-300/60 transition" />
            </div>
          </a>
        );
      })}
    </div>
  );

  // Recs MYFILM
  useEffect(() => {
    const tvId = Number(rawId);
    if (!Number.isFinite(tvId) || tvId <= 0) return;
    const fetchRecs = async () => {
      try {
        const urlMyfilm = `${apiBase}/mfb/recommendations/by-title?titleId=${tvId}&limit=22`;
        const res = await fetch(urlMyfilm, { cache: 'no-store' });
        if (!res.ok) throw new Error(`MFB ${res.status}`);
        const data = (await res.json()) as { results?: MfbRecommendation[] };
        setMfbRecs(data.results ?? []);
      } catch (e) {
        console.error('MFB recs error', e);
        setMfbRecs([]);
      }
    };
    fetchRecs();
  }, [rawId, apiBase]);

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
          <p className="text-lg font-semibold">{error ?? 'Serie no encontrada.'}</p>
          <code className="text-xs bg-black/60 px-2 py-1 rounded border border-white/10">
            /series/&lt;id_tmdb_serie&gt;
          </code>
        </div>
      </Container>
    );
  }

  return (
    <div className="relative min-h-screen text-white" style={layoutVars}>
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

      <Container className="max-w-[1800px]">
        <main
          className="py-10 space-y-10"
          style={{
            transform: `translateX(-${SHIFT_X_REM}rem)`,
            marginTop: `${SHIFT_Y_REM}rem`,
            width: `calc(100% + ${MAIN_EXTRA_RIGHT_REM}rem)`,
            paddingRight: `${MAIN_EXTRA_RIGHT_REM}rem`,
          }}
        >
          {/* CABECERA */}
          <section
            className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
            style={ROW_STRETCH_STYLE}
          >
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
                  <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                    <span className="text-amber-300">★</span>
                    <span className="ml-1 text-amber-300">{score}%</span>
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
                    className="inline-flex items-center justify-center px-6 py-2 rounded-full bg-amber-400/80 text-black font-semibold text-sm hover:bg-amber-300/80 transition-colors"
                  >
                    ▶ Ver tráiler
                  </a>
                </div>
              )}
              {/* PLATAFORMAS debajo del tráiler */}
              {(displayProviders.sub.length > 0 ||
                displayProviders.rent.length > 0 ||
                displayProviders.buy.length > 0) && (
                <div className="space-y-4 pt-2">
                  {displayProviders.sub.length > 0 && (
                    <div className="space-y-3">
                      <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wide">
                        Disponible en
                      </h2>
                      {renderProviderGrid(displayProviders.sub)}
                    </div>
                  )}
                  {displayProviders.rent.length > 0 && (
                    <div className="space-y-3">
                      <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wide">
                        Alquiler
                      </h2>
                      {renderProviderGrid(displayProviders.rent)}
                    </div>
                  )}
                  {displayProviders.buy.length > 0 && (
                    <div className="space-y-3">
                      <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wide">
                        Compra
                      </h2>
                      {renderProviderGrid(displayProviders.buy)}
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* segunda columna vacía para mantener el ancho en desktop */}
            <div />
          </section>

          {/* REPARTO PRINCIPAL */}
          {topCast.length > 0 && (
            <section className="space-y-4" style={ROW_STRETCH_STYLE}>
              <h2 className="text-xl font-semibold">Reparto principal</h2>
              <div className="flex gap-4 overflow-x-auto pb-3 pr-2">
                {topCast.map((actor, idx) => {
                  const key = `${actor.id}-${idx}`;
                  const img = actor.profile_path
                    ? `https://image.tmdb.org/t/p/w342${actor.profile_path}`
                    : null;

                  return (
                    <a
                      key={key}
                      href={`/person/${actor.id}`}
                      className="group relative min-w-[170px] max-w-[170px] rounded-lg overflow-hidden shadow-[0_10px_25px_rgba(0,0,0,0.6)]"
                      title={`${actor.name}${actor.character ? ` — ${actor.character}` : ''}`}
                    >
                      {img ? (
                        <img
                          src={img}
                          alt={actor.name}
                          className="w-full aspect-[2/3] object-cover"
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
                            {actor.name}
                          </div>
                          {actor.character && (
                            <div className="mt-0.5 text-xs text-white/90 leading-snug line-clamp-2">
                              {actor.character}
                            </div>
                          )}
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </section>
          )}

          {/* TEMPORADAS + EPISODIOS */}
          {seasons.length > 0 && (
            <section className="space-y-4" style={ROW_STRETCH_STYLE}>
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
                        className="group flex-shrink-0 w-[320px]"
                      >
                        <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-white/5 border border-white/10 mb-2">
                          {imgSrc ? (
                            <img
                              src={imgSrc}
                              alt={ep.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-white/70">
                              Sin imagen
                            </div>
                          )}
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="absolute inset-0 bg-black/45" />
                            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/85 via-black/50 to-transparent">
                              <div className="text-sm font-semibold text-amber-300 leading-tight line-clamp-2">
                                {ep.episode_number}. {ep.name}
                              </div>
                              {ep.overview && (
                                <div className="mt-1 text-xs text-white/90 leading-snug line-clamp-3">
                                  {ep.overview}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* SERIES SIMILARES / RECOMENDADAS */}
          {/* Recomendadas por MYFILM */}
          {mfbRecs.length > 0 && (
            <section className="space-y-2" style={ROW_STRETCH_STYLE}>
              <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wide">
                Relacionadas por MYFILM
              </h2>
              <div className="flex gap-4 overflow-x-auto pb-3 pr-2">
                {mfbRecs.map((r, idx) => {
                  const idForUrl = Number(r.tmdb_id ?? 0);
                  const displayTitle = r.title || r.original_title || 'Sin título';
                  const key = `${idForUrl || 'x'}-${idx}`;

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
                    <div
                      key={key}
                      className="min-w-[170px] max-w-[170px] scale-[0.72] sm:scale-[0.76] md:scale-[0.78] origin-top-left mr-5"
                    >
                      <PosterCard
                        id={idForUrl}
                        title={displayTitle}
                        poster_path={r.poster_path || null}
                        backdrop_path={r.backdrop_path || null}
                        year={r.year ? String(r.year) : undefined}
                        rating={typeof r.vote_average === 'number' ? r.vote_average : undefined}
                        href={`/series/${idForUrl}`}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* SERIES SIMILARES / TMDB */}
          {similar.length > 0 && (
            <section className="space-y-2" style={ROW_STRETCH_STYLE}>
              <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wide">
                Series similares que quizá te gusten
              </h2>
              <div className="flex gap-4 overflow-x-auto pb-3 pr-2">
                {similar.map((m) => (
                  <div
                    key={`${m.media_type || 'tv'}-${m.id}`}
                    className="min-w-[170px] max-w-[170px] scale-[0.72] sm:scale-[0.76] md:scale-[0.78] origin-top-left mr-5"
                  >
                    <PosterCard
                      id={m.id}
                      title={m.title || m.name || ''}
                      poster_path={m.poster_path}
                      backdrop_path={m.backdrop_path}
                      year={(m.release_date || m.first_air_date || '').slice(0, 4)}
                      rating={m.vote_average}
                      href={`/series/${m.id}`}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      </Container>
    </div>
  );
}
