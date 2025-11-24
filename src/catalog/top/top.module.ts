import { Module } from '@nestjs/common';
import { TopController } from './top.controller';
import { TmdbModule } from '../../tmdb/tmdb.module';

@Module({
  imports: [TmdbModule],
  controllers: [TopController],
})
export class TopModule {}
