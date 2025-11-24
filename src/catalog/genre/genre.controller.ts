import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import { TmdbService } from '../../tmdb/tmdb.service';

@ApiTags('Genre')
@UseInterceptors(CacheInterceptor)
@Controller('genre')
export class GenreController {
  constructor(private readonly tmdb: TmdbService) {}

  @Get(':type')
  @ApiParam({ name: 'type', enum: ['movie', 'tv'] })
  async list(@Param('type') type: 'movie' | 'tv') {
    return this.tmdb.getGenres({ type });
  }
}
