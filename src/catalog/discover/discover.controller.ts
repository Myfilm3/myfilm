import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { TmdbService } from '../../tmdb/tmdb.service';

@ApiTags('Discover')
@UseInterceptors(CacheInterceptor)
@Controller('discover')
export class DiscoverController {
  constructor(private readonly tmdb: TmdbService) {}

  @Get()
  @ApiQuery({ name: 'type', required: true, enum: ['movie', 'tv'] })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'with_genres', required: false, example: '28,12' })
  @ApiQuery({ name: 'with_watch_providers', required: false, example: '8,337' })
  @ApiQuery({ name: 'sort_by', required: false, example: 'popularity.desc' })
  @ApiQuery({ name: 'year', required: false, example: 2024 })
  @ApiQuery({ name: 'vote_count_gte', required: false, example: 100 })
  @ApiQuery({ name: 'region', required: false, example: 'ES' })
  async discover(
    @Query('type') type: 'movie' | 'tv',
    @Query('page') page = '1',
    @Query('with_genres') with_genres?: string,
    @Query('with_watch_providers') with_watch_providers?: string,
    @Query('sort_by') sort_by?: string,
    @Query('year') year?: string,
    @Query('vote_count_gte') vote_count_gte?: string,
    @Query('region') region?: string,
  ) {
    return this.tmdb.discover({
      type,
      page: Number(page) || 1,
      with_genres,
      with_watch_providers,
      sort_by,
      year: year ? Number(year) : undefined,
      vote_count_gte: vote_count_gte ? Number(vote_count_gte) : undefined,
      region,
    });
  }
}
