// src/mfb/mfb.module.ts
import { Module } from '@nestjs/common';
import { MfbController } from './mfb.controller';
import { MyFilmBrainService } from './myfilmbrain.service';
import { QdrantService } from './qdrant.service';
import { TmdbService } from './tmdb.service';

@Module({
  controllers: [MfbController],
  providers: [MyFilmBrainService, QdrantService, TmdbService],
  exports: [MyFilmBrainService],
})
export class MfbModule {}
