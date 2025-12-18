// src/mfb/mfb.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { MyFilmBrainService } from './myfilmbrain.service';

@Controller('mfb')
export class MfbController {
  constructor(private readonly brain: MyFilmBrainService) {}

  // =====================================================
  // 🔥 PRODUCCIÓN (V2)
  // =====================================================
  @Get('recommendations/by-title')
  async byTitle(
    @Query('titleId') titleIdRaw: string,
    @Query('limit') limitRaw?: string,
  ) {
    const titleId = Number(titleIdRaw);
    const limit = Math.min(Number(limitRaw ?? 22), 50);

    if (!Number.isFinite(titleId) || titleId <= 0) {
      return { titleId, count: 0, results: [] };
    }

    return this.brain.recommendByTitleIdV2(titleId, limit);
  }

  // =====================================================
  // 🧪 EXPERIMENTAL (GENÉRICO)
  // URL FIJA: /mfb/debug/experiment?titleId=155&mix=1-2-7&limit=22
  // - mix por defecto: 1-2-10
  // =====================================================
  @Get('debug/experiment')
  async experiment(
    @Query('titleId') titleIdRaw: string,
    @Query('mix') mixRaw?: string,
    @Query('limit') limitRaw?: string,
  ) {
    if (!titleIdRaw) return { error: 'titleId missing', titleId: null, count: 0, results: [] };

    const titleId = Number(titleIdRaw);
    const limit = Math.min(Number(limitRaw ?? 22), 50);

    if (!Number.isFinite(titleId) || titleId <= 0) {
      return { error: 'invalid titleId', titleId: titleIdRaw, count: 0, results: [] };
    }

    const mix = (mixRaw || '1-2-10').trim();
    return this.brain.recommendByTitleId_ExperimentMix(titleId, limit, mix);
  }
}