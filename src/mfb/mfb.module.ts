import { Module } from '@nestjs/common';
import { MfbController } from './mfb.controller';

@Module({
  controllers: [MfbController],
})
export class MfbModule {}
