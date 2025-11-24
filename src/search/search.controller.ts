import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { TmdbService } from '../tmdb/tmdb.service';

@ApiTags('Search')
@UseInterceptors(CacheInterceptor)
@Controller('search')
export class SearchController {
  constructor(private readonly tmdb: TmdbService) {}

  @Get()
  @ApiQuery({ name: 'q', required: true, example: 'Dune' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['multi', 'movie', 'tv', 'person'],
    example: 'multi',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  async search(
    @Query('q') q: string,
    @Query('type') type: 'multi' | 'movie' | 'tv' | 'person' = 'multi',
    @Query('page') page = '1',
  ) {
    if (!q?.trim()) return { error: 'Missing query param q' };
    return this.tmdb.search({ q: q.trim(), type, page: Number(page) || 1 });
  }
}
