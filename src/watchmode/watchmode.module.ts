import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WatchmodeService } from '../watchmode.service'; // está en src/watchmode.service.ts

@Module({
  imports: [HttpModule],
  providers: [WatchmodeService],
  exports: [WatchmodeService],
})
export class WatchmodeModule {}
