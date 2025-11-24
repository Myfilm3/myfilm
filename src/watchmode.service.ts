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
}
