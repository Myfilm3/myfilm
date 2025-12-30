import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WatchmodeService } from '../watchmode.service'; // está en src/watchmode.service.ts
import { WatchmodeController } from './watchmode.controller';

@Module({
  imports: [HttpModule],
  providers: [WatchmodeService],
  exports: [WatchmodeService],
  controllers: [WatchmodeController],
})
export class WatchmodeModule {}
