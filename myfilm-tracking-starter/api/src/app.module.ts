import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AnalyticsModule } from '../../../src/modules/analytics/analytics.module';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({
      connection: { url: process.env.REDIS_URL || 'redis://localhost:6379' },
      defaultJobOptions: { removeOnComplete: 1000, removeOnFail: 100 },
      prefix: process.env.BULL_PREFIX || 'myfilm',
    }),
    AnalyticsModule,
  ],
})
export class AppModule {}
