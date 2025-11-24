export const API =
  process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api';

/* ============ TOP LISTS ============ */

type TopKind = 'popular' | 'trending' | 'upcoming' | 'top_rated';

type TopOptions = {
  type?: 'movie' | 'tv' | 'all';
  window?: 'day' | 'week';
  page?: number;
};

export async function getTop(kind: TopKind, opts: TopOptions = {}) {
  const { type, window, page = 1 } = opts;

  const params = new URLSearchParams();
  params.set('page', String(page));
  if (type) params.set('type', type);
  if (kind === 'trending' && window) params.set('window', window);

  const qs = params.toString();
  const url = `${API}/top/${kind}?${qs}`;

  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`Top ${kind} failed`);

  return res.json() as Promise<{
    page: number;
    results: Array<{
      id: number;
      title?: string;
      name?: string;
      poster_path?: string | null;
      backdrop_path?: string | null;
      vote_average?: number;
      media_type?: 'movie' | 'tv';
      release_date?: string;
      first_air_date?: string;
      overview?: string;
    }>;
    total_pages: number;
    total_results: number;
  }>;
}

/** Utilidad para imágenes TMDB */
export function img(
  path?: string | null,
  size: 'w185' | 'w342' | 'w500' = 'w342',
) {
  if (!path) return '/placeholder-poster.svg';
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

/* ========= TMDB base ========= */

const TMDB = 'https://api.themoviedb.org/3';
const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_KEY;

type Provider = {
  provider_id: number;
  provider_name: string;
  logo_path?: string | null;
};

/* ========= MOVIES ========= */

export type MovieDetails = {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  backdrop_path?: string | null;
  poster_path?: string | null;
  genres?: { id: number; name: string }[];
  runtime?: number | null;
  release_date?: string;
  vote_average?: number;
  'watch/providers'?: {
    results?: {
      [country: string]: {
        flatrate?: Provider[];
        rent?: Provider[];
        buy?: Provider[];
      };
    };
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

/** Detalle de película directo a TMDB */
export async function getMovie(
  id: number | string,
): Promise<MovieDetails | null> {
  if (!TMDB_KEY) {
    console.error('❌ Falta NEXT_PUBLIC_TMDB_KEY');
    return null;
  }

  const url = `${TMDB}/movie/${id}?api_key=${TMDB_KEY}&language=es-ES&append_to_response=videos,credits,watch/providers,recommendations,release_dates,images`;

  const res = await fetch(url, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) {
    console.error('❌ Error getMovie TMDB', res.status, await res.text());
    return null;
  }

  return (await res.json()) as MovieDetails;
}

/* ========= TV / SERIES ========= */

export type TvSeasonLite = {
  id: number;
  name: string;
  season_number: number;
  air_date?: string | null;
  episode_count?: number | null;
  poster_path?: string | null;
};

export type TvDetails = {
  id: number;
  name?: string | null;
  original_name?: string | null;
  overview?: string | null;
  backdrop_path?: string | null;
  poster_path?: string | null;
  genres?: { id: number; name: string }[];
  first_air_date?: string | null;
  vote_average?: number;
  episode_run_time?: number[];
  seasons?: TvSeasonLite[];

  created_by?: { id: number; name: string }[];

  credits?: {
    cast?: Array<{
      id: number;
      name: string;
      character?: string | null;
      profile_path?: string | null;
    }>;
    crew?: Array<{
      id: number;
      name: string;
      job?: string | null;
      department?: string | null;
      profile_path?: string | null;
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

  'watch/providers'?: {
    results?: {
      [country: string]: {
        flatrate?: Provider[];
        rent?: Provider[];
        buy?: Provider[];
      };
    };
  };
};

/** Detalle de serie (TV) */
export async function getTv(
  id: number | string,
): Promise<TvDetails | null> {
  if (!TMDB_KEY) {
    console.error('❌ Falta NEXT_PUBLIC_TMDB_KEY');
    return null;
  }

  const url = `${TMDB}/tv/${id}?api_key=${TMDB_KEY}&language=es-ES&append_to_response=videos,credits,watch/providers,recommendations,similar,images,content_ratings`;

  const res = await fetch(url, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) {
    console.error('❌ Error getTv TMDB', res.status, await res.text());
    return null;
  }

  return (await res.json()) as TvDetails;
}

/* ========= SEASONS / EPISODES ========= */

export type EpisodeDetails = {
  id: number;
  name: string;
  overview?: string | null;
  air_date?: string | null;
  episode_number: number;
  season_number: number;
  runtime?: number | null;
  still_path?: string | null;
};

export type SeasonDetails = {
  id: number;
  name: string;
  season_number: number;
  air_date?: string | null;
  episode_count?: number | null;
  overview?: string | null;
  poster_path?: string | null;
  episodes?: EpisodeDetails[];
};

/** Detalle de temporada de una serie */
export async function getSeason(
  tvId: number,
  seasonNumber: number,
): Promise<SeasonDetails | null> {
  if (!TMDB_KEY) {
    console.error('❌ Falta NEXT_PUBLIC_TMDB_KEY');
    return null;
  }

  const url = `${TMDB}/tv/${tvId}/season/${seasonNumber}?api_key=${TMDB_KEY}&language=es-ES`;

  const res = await fetch(url, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) {
    console.error('❌ Error getSeason TMDB', res.status, await res.text());
    return null;
  }

  return (await res.json()) as SeasonDetails;
}

/** Detalle de episodio de una serie */
export async function getEpisode(
  tvId: number,
  seasonNumber: number,
  episodeNumber: number,
): Promise<EpisodeDetails | null> {
  if (!TMDB_KEY) {
    console.error('❌ Falta NEXT_PUBLIC_TMDB_KEY');
    return null;
  }

  const url = `${TMDB}/tv/${tvId}/season/${seasonNumber}/episode/${episodeNumber}?api_key=${TMDB_KEY}&language=es-ES`;

  const res = await fetch(url, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) {
    console.error('❌ Error getEpisode TMDB', res.status, await res.text());
    return null;
  }

  return (await res.json()) as EpisodeDetails;
}

/* ========= LOGO / TRÁILER ========= */

type TmdbLogo = {
  file_path?: string | null;
  iso_639_1?: string | null;
  width?: number | null;
};

type TmdbVideo = {
  key?: string;
  site?: string;
  type?: string;
  iso_639_1?: string | null;
};

/**
 * Logo priorizando ES → EN → resto.
 */
export async function getTitleLogo(
  type: 'movie' | 'tv',
  id: number,
): Promise<string | null> {
  if (!TMDB_KEY) return null;

  const url = `${TMDB}/${type}/${id}/images?api_key=${TMDB_KEY}&include_image_language=es-ES,es,en-US,en,null`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;

  const data = (await res.json()) as { logos?: TmdbLogo[] };
  const logos: TmdbLogo[] = data?.logos ?? [];

  const pref = (lang?: string | null) =>
    lang === 'es-ES' || lang === 'es'
      ? 3
      : lang === 'en-US' || lang === 'en'
      ? 2
      : 1;

  logos.sort(
    (a, b) =>
      pref(b.iso_639_1 ?? null) - pref(a.iso_639_1 ?? null) ||
      (b.width ?? 0) - (a.width ?? 0),
  );

  const best = logos.find((l) => !!l.file_path);
  return best?.file_path
    ? `https://image.tmdb.org/t/p/w500${best.file_path}`
    : null;
}

/**
 * Devuelve la URL embebible de YouTube para el tráiler (o teaser).
 */
export async function getTrailer(
  type: 'movie' | 'tv',
  id: number,
): Promise<string | null> {
  if (!TMDB_KEY) return null;

  const tryLang = async (lang: string) => {
    const url = `${TMDB}/${type}/${id}/videos?api_key=${TMDB_KEY}&language=${lang}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;

    const data = (await res.json()) as { results?: TmdbVideo[] };
    const vids: TmdbVideo[] = data?.results ?? [];

    const filtered = vids.filter(
      (v) => (v.site ?? '').toLowerCase() === 'youtube' && v.key,
    );
    if (!filtered.length) return null;

    const rank = (t: string | undefined) =>
      t === 'Trailer' ? 2 : t === 'Teaser' ? 1 : 0;

    filtered.sort((a, b) => rank(b.type) - rank(a.type));

    const pick = filtered[0];
    return pick?.key ? `https://www.youtube.com/embed/${pick.key}` : null;
  };

  return (await tryLang('es-ES')) || (await tryLang('en-US')) || null;
}

/* ========= PERSONAS ========= */

export type PersonCreditEntry = {
  id: number;
  media_type?: 'movie' | 'tv';
  title?: string | null;
  name?: string | null;
  poster_path?: string | null;
  vote_count?: number;
  popularity?: number;
};

export type PersonCredits = {
  cast?: PersonCreditEntry[];
  crew?: PersonCreditEntry[];
};

export type PersonDetails = {
  id: number;
  name: string;
  biography?: string | null;
  profile_path?: string | null;
  birthday?: string | null;
  deathday?: string | null;
  place_of_birth?: string | null;
  known_for_department?: string | null;
  combined_credits?: PersonCredits;
};

/** Detalle de persona (con combined_credits) */
export async function getPerson(
  id: number,
): Promise<PersonDetails | null> {
  if (!TMDB_KEY) {
    console.error('❌ Falta NEXT_PUBLIC_TMDB_KEY');
    return null;
  }

  const url = `${TMDB}/person/${id}?api_key=${TMDB_KEY}&language=es-ES&append_to_response=combined_credits,images`;

  const res = await fetch(url, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) {
    console.error('❌ Error getPerson TMDB', res.status, await res.text());
    return null;
  }

  return (await res.json()) as PersonDetails;
}

/** Créditos combinados de una persona (por separado) */
export async function getPersonCredits(
  id: number,
): Promise<PersonCredits | null> {
  if (!TMDB_KEY) {
    console.error('❌ Falta NEXT_PUBLIC_TMDB_KEY');
    return null;
  }

  const url = `${TMDB}/person/${id}/combined_credits?api_key=${TMDB_KEY}&language=es-ES`;

  const res = await fetch(url, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) {
    console.error('❌ Error getPersonCredits TMDB', res.status, await res.text());
    return null;
  }

  return (await res.json()) as PersonCredits;
}

/* ========= COLECCIONES ========= */

export type CollectionPart = {
  id: number;
  title?: string | null;
  name?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string | null;
};

export type CollectionDetails = {
  id: number;
  name: string;
  overview?: string | null;
  backdrop_path?: string | null;
  parts?: CollectionPart[];
};

/** Detalle de colección (sagas/sagas de películas) */
export async function getCollection(
  id: number,
): Promise<CollectionDetails | null> {
  if (!TMDB_KEY) {
    console.error('❌ Falta NEXT_PUBLIC_TMDB_KEY');
    return null;
  }

  const url = `${TMDB}/collection/${id}?api_key=${TMDB_KEY}&language=es-ES`;

  const res = await fetch(url, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) {
    console.error('❌ Error getCollection TMDB', res.status, await res.text());
    return null;
  }

  return (await res.json()) as CollectionDetails;
}
