import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { CatalogModule } from './catalog/catalog.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MfbModule } from './mfb/mfb.module';
import { WatchmodeModule } from './watchmode/watchmode.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule.register({ isGlobal: true, ttl: 60 }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),

    CatalogModule,
    AnalyticsModule,
    AuthModule,
    UsersModule,
    MfbModule, // 👈
    WatchmodeModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
