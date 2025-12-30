import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class WatchmodeService {
  private readonly apiKey: string;
  private readonly base: string;

  constructor(
    private cfg: ConfigService,
    private http: HttpService,
  ) {
    this.apiKey = this.cfg.get<string>('WATCHMODE_API_KEY')!;
    this.base =
      this.cfg.get<string>('WATCHMODE_BASE') ?? 'https://api.watchmode.com/v1';
  }

  async getMostWatched(opts: { limit?: number; region?: string } = {}) {
    const { limit = 20, region } = opts;
    // Lista de títulos populares. Watchmode ofrece listados ordenados por “popularity”
    const url = `${this.base}/list-titles/`;
    const { data } = await lastValueFrom(
      this.http.get(url, {
        params: {
          apiKey: this.apiKey,
          types: 'movie,tv_series',
          sort_by: 'popularity_desc',
          limit,
          region, // opcional
        },
      }),
    );

    // Normalizamos salida
    return (data?.titles ?? data?.results ?? data ?? []).map((t: any) => ({
      id: t.id || t.title_id,
      title: t.title,
      year: t.year || t.release_year,
      type: t.type || t.title_type,
      poster: t.poster || t.poster_url || null,
      imdb_id: t.imdb_id ?? null,
      tmdb_id: t.tmdb_id ?? null,
      popularity: t.popularity ?? undefined,
    }));
  }

  /**
   * Devuelve deeplinks por plataforma (web/ios/android) a partir de un TMDB id.
   * 1) Busca el título en Watchmode por tmdb_id.
   * 2) Coge el primer match y obtiene las fuentes para la región indicada.
   */
  async getDeeplinksByTmdb(opts: {
    tmdbId: number | string;
    region?: string;
    title?: string;
    year?: number | string | null;
    debug?: boolean;
  }) {
    const { tmdbId, region = 'ES', title, year, debug = false } = opts;

    const searchErrors: any[] = [];

    const fetchSearch = async (params: Record<string, any>, step: string) => {
      try {
        const res = await lastValueFrom(
          this.http.get(`${this.base}/search/`, {
            params: {
              apiKey: this.apiKey,
              ...params,
            },
          }),
        );
        return res.data;
      } catch (e: any) {
        searchErrors.push({ step, error: e?.message ?? String(e) });
        return null;
      }
    };

    const results: any[] = [];

    // 1) TMDB movie
    const rMovie = await fetchSearch(
      { search_field: 'tmdb_movie_id', search_value: tmdbId },
      'tmdb_movie_id',
    );
    if (rMovie?.title_results) results.push(...rMovie.title_results);

    // 2) TMDB tv
    if (results.length === 0) {
      const rTv = await fetchSearch(
        { search_field: 'tmdb_tv_id', search_value: tmdbId },
        'tmdb_tv_id',
      );
      if (rTv?.title_results) results.push(...rTv.title_results);
    }

    // 3) Por nombre
    if (results.length === 0 && title) {
      const rName = await fetchSearch(
        { search_field: 'name', search_value: title },
        'name',
      );
      if (rName?.title_results) {
        const arr = rName.title_results as any[];
        const y = Number(year);
        const filtered =
          Number.isFinite(y) && y > 1900
            ? arr.filter((r) => (r?.year ?? r?.release_year) === y || (r?.first_air_date_year ?? null) === y)
            : arr;
        results.push(...filtered);
      }
    }

    const match = results.find((r) => r?.id) || results[0];
    const wmId = match?.id ? String(match.id) : null;
    if (!wmId) return { links: [], debug: { results, sources: [], match: null, searchErrors } };

    const fetchSources = async (regions: string) => {
      const res = await lastValueFrom(
        this.http.get(`${this.base}/title/${wmId}/sources/`, {
          params: {
            apiKey: this.apiKey,
            regions,
          },
        }),
      );
      return res.data ?? [];
    };

    const candidateRegions = [region, region !== 'US' ? 'US' : null, ''];
    let sources: any[] = [];
    const sourceErrors: any[] = [];
    for (const r of candidateRegions) {
      if (r === null) continue;
      try {
        sources = await fetchSources(r);
        if (sources.length) break;
      } catch (e: any) {
        sourceErrors.push({ region: r, error: e?.message ?? String(e) });
      }
    }

    const seen = new Set<number>();
    const cleanLink = (v?: string | null) => {
      if (!v || typeof v !== 'string') return null;
      if (v.toLowerCase().includes('deeplinks available')) return null;
      return v;
    };

    const links = (sources ?? [])
      .filter((s: any) => cleanLink(s.web_url) || cleanLink(s.ios_url) || cleanLink(s.android_url))
      .filter((s: any) => {
        if (!s?.source_id) return true;
        if (seen.has(s.source_id)) return false;
        seen.add(s.source_id);
        return true;
      })
      .map((s: any) => ({
        source_id: s.source_id ?? null,
        name: s.name ?? s.source_name ?? 'Desconocido',
        type: s.type ?? s.source_type ?? null,
        region: s.region ?? null,
        price: s.price ?? null,
        web_url: cleanLink(s.web_url),
        android_url: cleanLink(s.android_url),
        ios_url: cleanLink(s.ios_url),
      }));

    const debugData = debug
      ? {
          results,
          match: results.find((r) => r?.id) || results[0] || null,
          sources,
          searchErrors,
          sourceErrors,
        }
      : undefined;

    return { links, debug: debugData };
  }
}
