import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { WatchmodeService } from '../../watchmode.service';

@ApiTags('Most Watched')
@Controller('api/most-watched')
export class MostWatchedController {
  constructor(private readonly watchmode: WatchmodeService) {}

  @Get()
  @ApiOperation({ summary: 'Lo más visto / popular (Watchmode)' })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({
    name: 'region',
    required: false,
    example: 'ES',
    description: 'Filtro por país si procede',
  })
  async getMostWatched(
    @Query('limit') limit = 20,
    @Query('region') region?: string,
  ) {
    return this.watchmode.getMostWatched({
      limit: Number(limit) || 20,
      region,
    });
  }
}
