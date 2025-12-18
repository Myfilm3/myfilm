// app/que-ver-hoy/lib/tmdb.ts
export type TmdbItem = {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  release_date?: string;
};

const TMDB_BASE = 'https://api.themoviedb.org/3';

function getApiKey() {
  return (process.env.NEXT_PUBLIC_TMDB_API_KEY || '').trim();
}

export function tmdbImg(path?: string | null, size: 'w342' | 'w500' | 'original' = 'w342') {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

async function tmdbFetch<T>(path: string, params: Record<string, string | number | undefined>) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('Falta NEXT_PUBLIC_TMDB_API_KEY en .env.local');

  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('language', 'es-ES');

  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined) return;
    url.searchParams.set(k, String(v));
  });

  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`TMDB ${res.status} ${res.statusText} | ${txt.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

export async function discoverMovies(params: Record<string, string | number | undefined>) {
  return tmdbFetch<{ results: TmdbItem[] }>('/discover/movie', params);
}

export async function discoverTV(params: Record<string, string | number | undefined>) {
  return tmdbFetch<{ results: TmdbItem[] }>('/discover/tv', params);
}