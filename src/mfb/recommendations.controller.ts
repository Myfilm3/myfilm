import { Controller, Get, Query } from '@nestjs/common';
import { MyFilmBrainService } from './myfilmbrain.service';

@Controller('mfb/recommendations')
export class RecommendationsController {
  constructor(private readonly brain: MyFilmBrainService) {}

  @Get('by-title')
  async byTitle(@Query('titleId') titleIdRaw: string, @Query('limit') limitRaw?: string) {
    const titleId = Number(titleIdRaw);
    const limit = Math.min(Number(limitRaw ?? 22), 50);

    if (!Number.isFinite(titleId) || titleId <= 0) {
      return { titleId, count: 0, results: [] };
    }

    return this.brain.recommendByTitleIdV2(titleId, limit);
  }
}