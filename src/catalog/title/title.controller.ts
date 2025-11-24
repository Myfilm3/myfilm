import { Controller, Get, Param, Query, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { TmdbService } from '../../tmdb/tmdb.service';

@ApiTags('Title')
@UseInterceptors(CacheInterceptor)
@Controller('title')
export class TitleController {
  constructor(private readonly tmdb: TmdbService) {}

  @Get(':type/:id')
  @ApiParam({ name: 'type', enum: ['movie', 'tv'] })
  @ApiParam({ name: 'id', example: 550 })
  async details(@Param('type') type: 'movie' | 'tv', @Param('id') id: string) {
    return this.tmdb.getTitle({ type, id });
  }

  @Get(':type/:id/images')
  @ApiParam({ name: 'type', enum: ['movie', 'tv'] })
  @ApiParam({ name: 'id', example: 550 })
  async images(@Param('type') type: 'movie' | 'tv', @Param('id') id: string) {
    return this.tmdb.getImages({ type, id });
  }

  @Get(':type/:id/credits')
  @ApiParam({ name: 'type', enum: ['movie', 'tv'] })
  @ApiParam({ name: 'id', example: 550 })
  async credits(@Param('type') type: 'movie' | 'tv', @Param('id') id: string) {
    return this.tmdb.getCredits({ type, id });
  }

  @Get(':type/:id/similar')
  @ApiParam({ name: 'type', enum: ['movie', 'tv'] })
  @ApiParam({ name: 'id', example: 550 })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  async similar(
    @Param('type') type: 'movie' | 'tv',
    @Param('id') id: string,
    @Query('page') page = '1',
  ) {
    return this.tmdb.getSimilar({ type, id, page: Number(page) || 1 });
  }

  @Get(':type/:id/recommendations')
  @ApiParam({ name: 'type', enum: ['movie', 'tv'] })
  @ApiParam({ name: 'id', example: 550 })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  async recommendations(
    @Param('type') type: 'movie' | 'tv',
    @Param('id') id: string,
    @Query('page') page = '1',
  ) {
    return this.tmdb.getRecommendations({ type, id, page: Number(page) || 1 });
  }

  @Get(':type/:id/providers')
  @ApiParam({ name: 'type', enum: ['movie', 'tv'] })
  @ApiParam({ name: 'id', example: 550 })
  async providers(
    @Param('type') type: 'movie' | 'tv',
    @Param('id') id: string,
  ) {
    return this.tmdb.getProviders({ type, id });
  }
}
