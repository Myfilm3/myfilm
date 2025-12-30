import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { WatchmodeService } from '../watchmode.service';

@ApiTags('Watchmode')
@Controller('watchmode')
export class WatchmodeController {
  constructor(private readonly watchmode: WatchmodeService) {}

  @Get('deeplinks')
  @ApiOperation({ summary: 'Deeplinks por plataforma (Watchmode)' })
  @ApiQuery({ name: 'tmdbId', required: true, example: 603692 })
  @ApiQuery({ name: 'region', required: false, example: 'ES' })
  @ApiQuery({ name: 'title', required: false, example: 'The Batman' })
  @ApiQuery({ name: 'year', required: false, example: 2022 })
  @ApiQuery({ name: 'debug', required: false, example: 1 })
  async deeplinks(
    @Query('tmdbId') tmdbId: string,
    @Query('region') region = 'ES',
    @Query('title') title?: string,
    @Query('year') year?: string,
    @Query('debug') debug?: string,
  ) {
    const res = await this.watchmode.getDeeplinksByTmdb({
      tmdbId: Number(tmdbId) || tmdbId,
      region,
      title,
      year: year ? Number(year) || year : null,
      debug: debug === '1' || debug === 'true',
    });

    if (debug === '1' || debug === 'true') return res;
    return res.links;
  }
}
