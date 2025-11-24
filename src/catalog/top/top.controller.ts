import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { TmdbService } from '../../tmdb/tmdb.service';

type MediaTypeParam = 'movie' | 'tv' | 'all';

@ApiTags('Top')
@UseInterceptors(CacheInterceptor)
@Controller('top')
export class TopController {
  constructor(private readonly tmdb: TmdbService) {}

  // 🔹 POPULARES (movie / tv / all)
  @Get('popular')
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['movie', 'tv', 'all'],
    example: 'all',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  async popular(
    @Query('type') mediaType: MediaTypeParam = 'all',
    @Query('page') page = '1',
  ) {
    const p = Number(page) || 1;

    // all = mezclamos pelis y series populares
    if (mediaType === 'all') {
      const [movies, tv] = await Promise.all([
        this.tmdb.getTopPopular({ mediaType: 'movie', page: p }),
        this.tmdb.getTopPopular({ mediaType: 'tv', page: p }),
      ]);

      const mRes = movies?.results ?? [];
      const tRes = tv?.results ?? [];

      const results = [...mRes, ...tRes].sort(
        (a, b) => (b?.popularity ?? 0) - (a?.popularity ?? 0),
      );

      return {
        page: p,
        results,
        total_results: results.length,
        total_pages: 1,
      };
    }

    // movie / tv como antes
    return this.tmdb.getTopPopular({
      mediaType: mediaType,
      page: p,
    });
  }

  // 🔹 TENDENCIAS (movie / tv / all)
  @Get('trending')
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['movie', 'tv', 'all'],
    example: 'all',
  })
  @ApiQuery({
    name: 'window',
    required: false,
    enum: ['day', 'week'],
    example: 'week',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  async trending(
    @Query('type') mediaType: MediaTypeParam = 'all',
    @Query('window') window: 'day' | 'week' = 'week',
    @Query('page') page = '1',
  ) {
    const p = Number(page) || 1;

    if (mediaType === 'all') {
      const apiKey = process.env.TMDB_API_KEY;
      const lang = process.env.TMDB_LANG || 'es-ES';
      const base = 'https://api.themoviedb.org/3';

      const url = `${base}/trending/all/${window}?api_key=${apiKey}&language=${lang}&page=${p}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('TMDB trending all failed');
      return res.json();
    }

    // movie / tv como antes
    return this.tmdb.getTrending({
      mediaType: mediaType,
      window,
      page: p,
    });
  }

  // 🔹 PRÓXIMOS ESTRENOS (solo películas, TMDB no tiene "all" aquí)
  @Get('upcoming')
  @ApiQuery({ name: 'page', required: false, example: 1 })
  async upcoming(@Query('page') page = '1') {
    return this.tmdb.getUpcoming({ page: Number(page) || 1 });
  }

  // 🔹 MEJOR VALORADAS (movie / tv / all)
  @Get('top_rated')
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['movie', 'tv', 'all'],
    example: 'all',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  async topRated(
    @Query('type') mediaType: MediaTypeParam = 'all',
    @Query('page') page = '1',
  ) {
    const p = Number(page) || 1;
    const apiKey = process.env.TMDB_API_KEY;
    const lang = process.env.TMDB_LANG || 'es-ES';
    const base = 'https://api.themoviedb.org/3';

    // all = mezclamos top_rated de pelis y series
    if (mediaType === 'all') {
      const [moviesRes, tvRes] = await Promise.all([
        fetch(
          `${base}/movie/top_rated?api_key=${apiKey}&language=${lang}&page=${p}`,
        ),
        fetch(
          `${base}/tv/top_rated?api_key=${apiKey}&language=${lang}&page=${p}`,
        ),
      ]);

      if (!moviesRes.ok && !tvRes.ok) {
        throw new Error('TMDB top_rated all failed');
      }

      const movies = moviesRes.ok ? await moviesRes.json() : { results: [] };
      const tv = tvRes.ok ? await tvRes.json() : { results: [] };

      const results = [...(movies.results ?? []), ...(tv.results ?? [])].sort(
        (a, b) => (b?.vote_average ?? 0) - (a?.vote_average ?? 0),
      );

      return {
        page: p,
        results,
        total_results: results.length,
        total_pages: 1,
      };
    }

    // movie / tv “limpio”
    const endpoint = mediaType === 'tv' ? '/tv/top_rated' : '/movie/top_rated';
    const url = `${base}${endpoint}?api_key=${apiKey}&language=${lang}&page=${p}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('TMDB top_rated failed');
    return res.json();
  }
}
