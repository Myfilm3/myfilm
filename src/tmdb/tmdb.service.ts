import { Injectable, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosRequestConfig } from 'axios';

type MediaType = 'movie' | 'tv';

@Injectable()
export class TmdbService {
  private readonly token: string;
  private readonly base =
    process.env.TMDB_BASE || 'https://api.themoviedb.org/3';
  private readonly lang = process.env.TMDB_LANG || 'es-ES';
  private readonly region = process.env.TMDB_REGION || 'ES';

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.token = this.config.get<string>('TMDB_API_KEY') || '';
  }

  // ===== CORE GET (auto v3/v4) =====
  private async get<T = any>(
    path: string,
    params?: Record<string, any>,
  ): Promise<T> {
    const isV4 = this.token.startsWith('eyJ'); // v4 = JWT largo
    const cfg: AxiosRequestConfig = {
      baseURL: this.base,
      url: path,
      method: 'GET',
      headers: isV4 ? { Authorization: `Bearer ${this.token}` } : undefined,
      params: {
        language: this.lang,
        region: this.region,
        ...(params || {}),
        ...(isV4 ? {} : { api_key: this.token }),
      },
    };

    try {
      const res = await firstValueFrom(this.http.request<T>(cfg));
      return res.data;
    } catch (err: any) {
      const status = err?.response?.status ?? 500;
      const msg =
        err?.response?.data?.status_message ||
        err?.message ||
        'TMDB request failed';
      throw new HttpException(`TMDB: ${msg}`, status);
    }
  }

  // ===== TOP =====
  hero() {
    return this.get('/trending/movie/day');
  }

  getTopPopular(params: { mediaType: MediaType; page?: number }) {
    const { mediaType, page = 1 } = params;
    const path = mediaType === 'tv' ? '/tv/popular' : '/movie/popular';
    return this.get(path, { page });
  }

  getTrending(params: {
    mediaType?: MediaType;
    window?: 'day' | 'week';
    page?: number;
  }) {
    const { mediaType = 'movie', window = 'day', page = 1 } = params || {};
    return this.get(`/trending/${mediaType}/${window}`, { page });
  }

  getUpcoming(params: { page?: number }) {
    const { page = 1 } = params || {};
    return this.get('/movie/upcoming', { page });
  }

  // ===== SEARCH =====
  search(params: {
    q: string;
    type?: 'multi' | 'movie' | 'tv' | 'person';
    page?: number;
  }) {
    const { q, type = 'multi', page = 1 } = params;
    return this.get(`/search/${type}`, {
      query: q,
      page,
      include_adult: false,
    });
  }

  // ===== TITLE =====
  getTitle(params: { type: MediaType; id: string | number }) {
    const { type, id } = params;
    return this.get(`/${type}/${id}`, {
      append_to_response:
        'images,credits,recommendations,similar,videos,watch/providers',
      include_image_language: `${this.lang.split('-')[0]},null`,
    });
  }

  getImages(params: { type: MediaType; id: string | number }) {
    const { type, id } = params;
    return this.get(`/${type}/${id}/images`, {
      include_image_language: `${this.lang.split('-')[0]},null`,
    });
  }

  getCredits(params: { type: MediaType; id: string | number }) {
    const { type, id } = params;
    return this.get(`/${type}/${id}/credits`);
  }

  getSimilar(params: { type: MediaType; id: string | number; page?: number }) {
    const { type, id, page = 1 } = params;
    return this.get(`/${type}/${id}/similar`, { page });
  }

  getRecommendations(params: {
    type: MediaType;
    id: string | number;
    page?: number;
  }) {
    const { type, id, page = 1 } = params;
    return this.get(`/${type}/${id}/recommendations`, { page });
  }

  getProviders(params: { type: MediaType; id: string | number }) {
    const { type, id } = params;
    return this.get(`/${type}/${id}/watch/providers`);
  }

  // ===== PERSON =====
  getPerson(params: { id: string | number }) {
    const { id } = params;
    return this.get(`/person/${id}`, {
      append_to_response: 'combined_credits,images',
    });
  }

  // ===== GENRES =====
  getGenres(params: { type: 'movie' | 'tv' }) {
    const { type } = params;
    return this.get(`/genre/${type}/list`);
  }

  // ===== CONFIG =====
  getConfiguration() {
    return this.get('/configuration');
  }

  // ===== PROVIDER LIST =====
  getProviderList(params: { type: 'movie' | 'tv'; region?: string }) {
    const { type, region } = params;
    const watch_region = region || this.region || 'ES';
    return this.get(`/watch/providers/${type}`, { watch_region });
  }

  // ===== DISCOVER =====
  discover(params: {
    type: 'movie' | 'tv';
    page?: number;
    with_genres?: string;
    with_watch_providers?: string;
    sort_by?: string;
    year?: number;
    vote_count_gte?: number;
    region?: string;
  }) {
    const {
      type,
      page = 1,
      with_genres,
      with_watch_providers,
      sort_by = 'popularity.desc',
      year,
      vote_count_gte,
      region,
    } = params;

    const q: Record<string, any> = {
      page,
      sort_by,
      watch_region: region || this.region || 'ES',
    };

    if (with_genres) q.with_genres = with_genres;
    if (with_watch_providers) q.with_watch_providers = with_watch_providers;
    if (vote_count_gte) q['vote_count.gte'] = vote_count_gte;

    if (type === 'movie' && year) q.primary_release_year = year;
    if (type === 'tv' && year) q.first_air_date_year = year;

    return this.get(`/discover/${type}`, q);
  }
}
