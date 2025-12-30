// app/movies/[id]/MoviePageClient.tsx
'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Container from '@/components/layout/Container';
import { getMovie, getTitleLogo, getTrailer, type MovieDetails } from '@/lib/api';
import PosterCard from '@/components/cards/PosterCard';

type Provider = {
  provider_id: number;
  provider_name: string;
  logo_path?: string | null;
  type?: 'sub' | 'rent' | 'buy';
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

const PLATFORM_LOGOS: Record<string, string> = {
  netflix: '/legacy/images/plataformas/netflix.png',
  disney: '/legacy/images/plataformas/disney.png',
  disneyplus: '/legacy/images/plataformas/disney.png',
  prime: '/legacy/images/plataformas/prime.png',
  primevideo: '/legacy/images/plataformas/prime.png',
  amazonprimevideo: '/legacy/images/plataformas/prime.png',
  amazon: '/legacy/images/plataformas/prime.png',
  Amazon: '/legacy/images/plataformas/prime.png',
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

function normalizeProviderName(name?: string | null) {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function getCustomProviderLogo(name?: string | null) {
  const key = normalizeProviderName(name);
  if (!key) return null;
  return PLATFORM_LOGOS[key] ?? null;
}

function pickBestUrl(link?: WatchmodeDeeplink | null) {
  if (!link) return null;
  return link.web_url || link.ios_url || link.android_url || null;
}

const SEARCH_ALIASES: Record<string, string> = {
  amazonprimevideo: 'prime',
  primevideo: 'prime',
  amazon: 'prime',
  Amazon: 'prime',
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

function buildAliases(norm: string) {
  const out = new Set<string>([norm]);
  const replacements = ['video', 'plus', 'channel', 'channels', 'conanuncios', 'standard'];
  replacements.forEach((frag) => {
    if (norm.includes(frag)) out.add(norm.replace(frag, ''));
  });
  if (norm.includes('amazon')) out.add(norm.replace('amazon', 'prime'));
  if (norm.includes('prime')) out.add(norm.replace('prime', 'amazon'));
  if (norm.includes('movistar')) out.add('movistarplus');
  if (norm.includes('movistarplus')) out.add('movistar');
  if (norm.includes('hbo')) out.add('max');
  if (norm.includes('max')) out.add('hbo');
  return Array.from(out).filter(Boolean);
}

function findDeeplinkForProvider(
  providerName: string,
  map: Map<string, WatchmodeDeeplink>,
  links: WatchmodeDeeplink[],
) {
  const norm = normalizeProviderName(providerName);
  const canon = canonicalProviderKey(providerName);
  const aliases = buildAliases(norm);
  if (canon) aliases.push(canon);

  for (const key of aliases) {
    const hit = map.get(key);
    if (hit) return hit;
  }

  // fallback: contains matching
  for (const link of links) {
    const lk = normalizeProviderName(link.name);
    if (!lk) continue;
    if (aliases.some((a) => lk.includes(a) || a.includes(lk))) return link;
  }
  return null;
}

function shouldExcludeProvider(provider?: Provider | null) {
  const normalized = normalizeProviderName(provider?.provider_name);
  if (!normalized) return false;
  return EXCLUDED_PROVIDER_MARKERS.some((marker) => normalized.includes(marker));
}

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

type WatchmodeDeeplink = {
  source_id?: number | null;
  name: string;
  type?: string | null;
  region?: string | null;
  web_url?: string | null;
  android_url?: string | null;
  ios_url?: string | null;
  price?: number | null;
};

function formatRuntime(mins?: number | null): string | null {
  if (!mins || mins <= 0) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (!h) return `${m} min`;
  if (!m) return `${h} h`;
  return `${h} h ${m} min`;
}

function getEsProviders(movie: MovieWithExtra): {
  sub: Provider[];
  rent: Provider[];
  buy: Provider[];
} {
  const root = (movie as any)?.['watch/providers']?.results?.ES;
  if (!root) return { sub: [], rent: [], buy: [] };

  const subs: Provider[] = [...(root.flatrate ?? [])].map((p) => ({
    ...p,
    type: 'sub',
  }));
  const rent: Provider[] = [...(root.rent ?? [])].map((p) => ({
    ...p,
    type: 'rent',
  }));
  const buy: Provider[] = [...(root.buy ?? [])].map((p) => ({
    ...p,
    type: 'buy',
  }));

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
  const [providersSub, setProvidersSub] = useState<Provider[]>([]);
  const [providersRent, setProvidersRent] = useState<Provider[]>([]);
  const [providersBuy, setProvidersBuy] = useState<Provider[]>([]);
  const [deeplinks, setDeeplinks] = useState<WatchmodeDeeplink[]>([]);
  const [deeplinksUrl, setDeeplinksUrl] = useState<string | null>(null);
  const [deeplinksDebug, setDeeplinksDebug] = useState<any>(null);
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);

  // ✅ MYFILM (PRODUCCIÓN)
  const [mfbRecs, setMfbRecs] = useState<MfbRecommendation[]>([]);
  const [mfbError, setMfbError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isDev = process.env.NODE_ENV !== 'production';

  const titleForSearch = useMemo(
    () => movie?.title || movie?.name || '',
    [movie?.title, movie?.name],
  );
  const yearForSearch = useMemo(
    () => movie?.release_date?.slice(0, 4) ?? null,
    [movie?.release_date],
  );

  const tmdbId = useMemo(() => {
    const n = Number(rawId);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [rawId]);

  const deeplinkByName = useMemo(() => {
    const map = new Map<string, WatchmodeDeeplink>();
    for (const link of deeplinks) {
      const norm = normalizeProviderName(link.name);
      const canon = canonicalProviderKey(link.name);
      if (norm && !map.has(norm)) map.set(norm, link);
      if (canon && !map.has(canon)) map.set(canon, link);
      buildAliases(norm).forEach((alias) => {
        if (alias && !map.has(alias)) map.set(alias, link);
      });
    }
    return map;
  }, [deeplinks]);

  const buildDisplayProviders = useMemo(() => {
    return (baseProviders: Provider[], wantedTypes: Array<'sub' | 'rent' | 'buy' | 'free'>) => {
      const map = new Map<
        string,
        {
          name: string;
          logoSrc: string | null;
          href: string | null;
          key: string | null;
          price?: number | null;
          type?: string | null;
        }
      >();

      const keyFor = (name?: string | null) => {
        const canon = name ? canonicalProviderKey(name) : null;
        const norm = name ? normalizeProviderName(name) : null;
        return canon || norm || null;
      };

      // 1) Deeplinks
      for (const link of deeplinks) {
        const linkType = (link.type as any) || 'sub';
        if (!wantedTypes.includes(linkType as any)) continue;
        const key = keyFor(link.name);
        const logoSrc = getCustomProviderLogo(link.name);
        const hrefDirect = pickBestUrl(link);
        const href = hrefDirect || buildSearchUrl(key, titleForSearch, yearForSearch);
        if (!href) continue;
        const mapKey = key || normalizeProviderName(link.name) || link.name;
        if (mapKey && map.has(mapKey)) continue;
        map.set(mapKey, {
          name: link.name,
          logoSrc,
          href,
          key,
          price: (link as any)?.price ?? null,
          type: linkType,
        });
      }

      // 2) TMDB providers
      for (const p of baseProviders) {
        const key = keyFor(p.provider_name);
        const mapKey = key || normalizeProviderName(p.provider_name) || p.provider_name;
        if (mapKey && map.has(mapKey)) continue;

        const customLogo = getCustomProviderLogo(p.provider_name);
        const fallbackLogo = p.logo_path
          ? `https://image.tmdb.org/t/p/w200${p.logo_path}`
          : null;
        const logoSrc = customLogo ?? fallbackLogo;

        const link = pickBestUrl(
          findDeeplinkForProvider(p.provider_name, deeplinkByName, deeplinks),
        );
        const searchUrl = buildSearchUrl(key, titleForSearch, yearForSearch);
        const href = link || searchUrl;
        if (!href) continue;

        map.set(mapKey, {
          name: p.provider_name,
          logoSrc,
          href,
          key,
          price: null,
          type: p.type,
        });
      }

      return Array.from(map.values()).filter((item) => item.href);
    };
  }, [deeplinks, deeplinkByName, titleForSearch, yearForSearch]);

  const displaySubs = useMemo(
    () => buildDisplayProviders(providersSub, ['sub', 'free']),
    [buildDisplayProviders, providersSub],
  );
  const displayRent = useMemo(
    () => buildDisplayProviders(providersRent, ['rent']),
    [buildDisplayProviders, providersRent],
  );
  const displayBuy = useMemo(
    () => buildDisplayProviders(providersBuy, ['buy']),
    [buildDisplayProviders, providersBuy],
  );

  const renderProviderGrid = (
    items: Array<{
      name: string;
      logoSrc: string | null;
      href: string | null;
      key: string | null;
      price?: number | null;
      type?: string | null;
    }>,
  ) => (
    <div className="flex flex-wrap gap-4">
      {items.map((p, idx) => {
        const name = p.name;
        const logoSrc = p.logoSrc;
        const link = p.href;
        if (!link) return null;
        const card = (
          <div
            key={p.key ?? `${name}-${idx}`}
            className="relative overflow-hidden rounded-2xl border border-white/20 bg-black/30 shadow-[0_12px_30px_rgba(0,0,0,0.4)] backdrop-blur-sm"
            style={PROVIDER_CARD_STYLE}
          >
            {logoSrc ? (
              <>
                <Image
                  src={logoSrc}
                  alt={name}
                  fill
                  sizes="200px"
                  className="object-cover"
                  style={{ filter: 'saturate(1.05)' }}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/30" />
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-white/80 bg-white/10">
                {name.slice(0, 3).toUpperCase()}
              </div>
            )}
            {p.price ? (
              <div className="absolute right-2 bottom-2 px-2 py-1 rounded-full bg-black/70 text-amber-300 text-xs font-semibold">
                €{p.price.toFixed(2)}
              </div>
            ) : null}
          </div>
        );

        return (
          <a
            key={`${name}-${idx}`}
            href={link}
            target="_blank"
            rel="noreferrer"
            className="group"
            aria-label={`Ver en ${name}`}
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
        const esProviders = getEsProviders(fullMovie);
        setProvidersSub(esProviders.sub);
        setProvidersRent(esProviders.rent);
        setProvidersBuy(esProviders.buy);
        setDeeplinks([]); // reset

        // 2) MFB (PRODUCCIÓN)
        const apiBase = normalizeApiBase(process.env.NEXT_PUBLIC_API_BASE);
        const urlMyfilm = `${apiBase}/mfb/recommendations/by-title?titleId=${tmdbId}&limit=22`;
        const urlDeeplinks = `${apiBase}/watchmode/deeplinks?tmdbId=${tmdbId}&region=ES&title=${encodeURIComponent(
          titleForSearch || '',
        )}&year=${yearForSearch ?? ''}${isDev ? '&debug=1' : ''}`;
        setDeeplinksUrl(urlDeeplinks);

        if (isDev) console.log('[MFB] Fetch MYFILM:', urlMyfilm);
        if (isDev) console.log('[Watchmode] Fetch deeplinks:', urlDeeplinks);

        const [rMyfilm, rDeeplinks] = await Promise.allSettled([
          fetchMfbRecommendations(urlMyfilm, 9000),
          fetch(urlDeeplinks, { cache: 'no-store' }).then(async (res) => {
            if (!res.ok) {
              if (isDev) console.warn('[Watchmode] Deeplinks', res.status, urlDeeplinks);
              return { links: [] as WatchmodeDeeplink[], debug: { error: `HTTP ${res.status}` } };
            }
            return (await res.json()) as WatchmodeDeeplink[];
          }),
        ]);

        if (cancelled) return;

        if (rMyfilm.status === 'fulfilled') {
          const r = rMyfilm.value;
          if (!r.ok) {
            const snippet = (r.rawBody || '').slice(0, 500);
            const msg = `MFB ${r.status} ${r.statusText} | ct=${r.contentType || 'n/a'} | url=${urlMyfilm} | body=${snippet || '∅'}`;
            if (isDev) console.error('[MFB] ERROR:', msg);
            setMfbError(msg);
            setMfbRecs([]);
          } else {
            const results = (r.results ?? []) as MfbRecommendation[];
            setMfbRecs(results);
            if (results.length === 0) setMfbError(`MFB OK pero 0 resultados | url=${urlMyfilm}`);
          }
        }

        if (rDeeplinks.status === 'fulfilled') {
          const payload: any = rDeeplinks.value ?? [];
          const links = Array.isArray(payload) ? payload : (payload.links ?? []);
          const debugInfo = Array.isArray(payload) ? null : payload.debug ?? null;
          setDeeplinks(links);
          setDeeplinksDebug(debugInfo);
          if (isDev) console.log('[Watchmode] Deeplinks response', { urlDeeplinks, payload });
        } else if (isDev) {
          console.error('[Watchmode] ERROR:', rDeeplinks.reason);
          setDeeplinks([]);
          setDeeplinksDebug({ error: String(rDeeplinks.reason) });
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
  }, [rawId, tmdbId, isDev, titleForSearch, yearForSearch]);

  useEffect(() => {
    setSynopsisExpanded(false);
  }, [movie?.id]);

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
  const synopsis = (movie as any).overview?.trim() ?? '';
  const shouldTruncateSynopsis = synopsis.length > 480;

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

  // 3) MEDIDAS DEL BLOQUE DE COLECCIÓN
  //    - cambia estos números para ajustar el tamaño del cuadro y se reescala la imagen
  const COLLECTION_THUMB_WIDTH = 730; // px
  const COLLECTION_THUMB_HEIGHT = 300; // px

  // 4) TARJETAS DE PLATAFORMAS
  const PROVIDER_CARD_WIDTH = 200; // px
  const PROVIDER_CARD_HEIGHT = 70; // px

  // =====================================================

  const layoutVars = {
    '--mf-shift': `${SHIFT_REM}rem`,
  } as CSSProperties;

  const HERO_SHIFT_CLASS = 'relative';
  const HERO_SHIFT_STYLE = { transform: 'translateX(calc(-1 * var(--mf-shift)))' } as CSSProperties;

  // Carrusel: empieza donde el HERO (izquierda) y se estira a la derecha hasta el borde del menú
  const ROW_STRETCH_STYLE = {
    marginLeft: 'calc(-1 * var(--mf-shift))',
    width: 'calc(100% + var(--mf-shift))',
  } as CSSProperties;

  const COLLECTION_THUMB_STYLE = {
    width: `${COLLECTION_THUMB_WIDTH}px`,
    height: `${COLLECTION_THUMB_HEIGHT}px`,
  } as CSSProperties;

  const PROVIDER_CARD_STYLE = {
    width: `${PROVIDER_CARD_WIDTH}px`,
    height: `${PROVIDER_CARD_HEIGHT}px`,
  } as CSSProperties;

  return (
    <div className="relative min-h-screen text-white" style={layoutVars}>
      {backgroundUrl && (
        <div className="fixed inset-0 -z-10">
          <Image
            src={backgroundUrl}
            alt={title}
            fill
            priority
            quality={85}
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/10" />
        </div>
      )}

      <Container>
        <main className="pb-10 space-y-10" style={{ paddingTop: CONTENT_TOP_PX }}>
          {/* HERO */}
          <section className={`${HERO_SHIFT_CLASS} space-y-5 max-w-3xl`} style={HERO_SHIFT_STYLE}>
            {titleLogo ? (
              <div className="relative w-full max-w-xl h-24">
                <Image
                  src={titleLogo}
                  alt={title}
                  fill
                  priority
                  sizes="480px"
                  className="object-contain drop-shadow-[0_0_25px_rgba(0,0,0,0.9)]"
                />
              </div>
            ) : (
              <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight drop-shadow-lg">
                {title}
              </h1>
            )}

            <div className="flex flex-wrap items-center gap-3 text-sm text-white/85">
              {score !== null && (
                <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                  <span className="text-amber-300">★</span>
                  <span className="ml-1 text-amber-300">{score}%</span>
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

            {synopsis && (
              <div className="space-y-2">
                <p
                  className={`text-base sm:text-lg leading-relaxed text-white/85 ${
                    !synopsisExpanded && shouldTruncateSynopsis ? 'line-clamp-5' : ''
                  }`}
                >
                  {synopsis}
                </p>
                {shouldTruncateSynopsis && (
                  <button
                    type="button"
                    onClick={() => setSynopsisExpanded((prev) => !prev)}
                    className="inline-flex items-center rounded-2xl bg-amber-400/90 text-black px-5 py-2 text-xs font-semibold shadow hover:bg-amber-300 transition"
                  >
                    {synopsisExpanded ? 'Mostrar menos' : 'Ver todo'}
                  </button>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-1">
              {trailer && (
                <a
                  href={trailer}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-2xl bg-amber-400 text-black px-10 py-4 text-sm font-semibold shadow-sm hover:bg-amber-300 transition"
                >
                Ver tráiler
                </a>
              )}
            </div>

              {displaySubs.length > 0 && (
                <div className="pt-4 space-y-2">
                  <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wide">
                    Disponible en
                  </h2>
                  {renderProviderGrid(displaySubs)}
                </div>
              )}

              {displayRent.length > 0 && (
                <div className="pt-4 space-y-2">
                  <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wide">
                    Alquiler
                  </h2>
                  {renderProviderGrid(displayRent)}
                </div>
              )}

              {displayBuy.length > 0 && (
                <div className="pt-4 space-y-2">
                  <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wide">
                    Compra
                  </h2>
                  {renderProviderGrid(displayBuy)}
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
                className="relative block group"
                style={{ ...COLLECTION_THUMB_STYLE, boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}
              >
                <div
                  className="pointer-events-none absolute inset-[-4px] rounded-[14px] opacity-0 transition duration-200 group-hover:opacity-100 shadow-[0_0_26px_rgba(255,176,32,0.4)]"
                  aria-hidden="true"
                />
                <div className="relative w-full h-full rounded-lg overflow-hidden">
                  {(collection.backdrop_path || collection.poster_path) && (
                    <Image
                      src={`https://image.tmdb.org/t/p/w500${
                        collection.backdrop_path ?? collection.poster_path
                      }`}
                      alt={collection.name}
                      fill
                      sizes="730px"
                      className="object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                    />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                  <div className="absolute inset-x-0 bottom-0 p-4 space-y-1">
                    <p className="text-base font-semibold">{collection.name}</p>
                    <p className="text-xs text-white/85">Ver todas las películas de esta saga.</p>
                  </div>
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
                      className="group relative min-w-[170px] max-w-[170px] rounded-lg overflow-hidden shadow-[0_10px_25px_rgba(0,0,0,0.6)]"
                      title={`${c.name}${c.character ? ` — ${c.character}` : ''}`}
                    >
                      {img ? (
                        <Image
                          src={img}
                          alt={c.name}
                          width={170}
                          height={255}
                          sizes="170px"
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
                        href={`/movies/${idForUrl}`}
                      />
                    </div>
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
                    <div
                      key={m.id}
                      className="min-w-[170px] max-w-[170px] scale-[0.72] sm:scale-[0.76] md:scale-[0.78] origin-top-left mr-5"
                    >
                      <PosterCard
                        id={m.id}
                        title={m.title || m.name || 'Sin título'}
                        poster_path={m.poster_path || null}
                        backdrop_path={m.backdrop_path || null}
                        year={
                          m.release_date?.slice(0, 4) ??
                          m.first_air_date?.slice(0, 4) ??
                          undefined
                        }
                        rating={typeof m.vote_average === 'number' ? m.vote_average : undefined}
                        href={href}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          )}
          {isDev && (
            <section className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/80 space-y-2 overflow-auto">
              <div className="font-semibold">Debug Watchmode Deeplinks</div>
              <div>URL: {deeplinksUrl ?? 'n/d'}</div>
              <pre className="whitespace-pre-wrap break-words">
                {JSON.stringify(
                  {
                    links: deeplinks,
                    debug: deeplinksDebug,
                  },
                  null,
                  2,
                )}
              </pre>
            </section>
          )}
        </main>
      </Container>
    </div>
  );
};
