// src/mfb/tmdb.service.ts
import { Injectable } from '@nestjs/common';

export type TmdbAny = {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
  genres?: Array<{ id: number; name: string }>;
  poster_path?: string | null;
  backdrop_path?: string | null;
  popularity?: number;
  vote_average?: number;
  vote_count?: number;
  _keywords?: string[];
};

@Injectable()
export class TmdbService {
  private readonly apiKey = process.env.TMDB_API_KEY!;
  private readonly base = 'https://api.themoviedb.org/3';
  private readonly lang = process.env.TMDB_LANG ?? 'es-ES';

  private async getJson<T>(path: string): Promise<T> {
    const url =
      `${this.base}${path}` +
      `${path.includes('?') ? '&' : '?'}api_key=${this.apiKey}` +
      `&language=${this.lang}`;

    const r = await fetch(url);
    if (!r.ok) throw new Error(await r.text());
    return r.json() as Promise<T>;
  }

  private async getKeywords(id: number): Promise<string[]> {
    try {
      const m = await this.getJson<{ keywords: { name: string }[] }>(
        `/movie/${id}/keywords`,
      );
      return m.keywords?.map(k => k.name.toLowerCase()) ?? [];
    } catch {
      try {
        const tv = await this.getJson<{ results: { name: string }[] }>(
          `/tv/${id}/keywords`,
        );
        return tv.results?.map(k => k.name.toLowerCase()) ?? [];
      } catch {
        return [];
      }
    }
  }

  async titleAny(tmdbId: number): Promise<TmdbAny | null> {
    if (!tmdbId) return null;

    try {
      const movie = await this.getJson<TmdbAny>(`/movie/${tmdbId}`);
      movie._keywords = await this.getKeywords(tmdbId);
      return movie;
    } catch {
      try {
        const tv = await this.getJson<TmdbAny>(`/tv/${tmdbId}`);
        tv._keywords = await this.getKeywords(tmdbId);
        return tv;
      } catch {
        return null;
      }
    }
  }

  async enrichMany(ids: number[], concurrency = 6): Promise<TmdbAny[]> {
    const queue = [...new Set(ids.filter(Boolean))];
    const out: TmdbAny[] = [];

    const worker = async () => {
      while (queue.length) {
        const id = queue.shift();
        if (!id) return;
        const t = await this.titleAny(id).catch(() => null);
        if (t) out.push(t);
      }
    };

    await Promise.all(Array.from({ length: concurrency }, worker));
    return out;
  }
}