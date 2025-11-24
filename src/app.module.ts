// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { CatalogModule } from './catalog/catalog.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

// 👇 nuevos
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    // Vars de entorno globales
    ConfigModule.forRoot({ isGlobal: true }),

    // Caché global (TTL 60s)
    CacheModule.register({
      isGlobal: true,
      ttl: 60,
    }),

    // Rate limit básico: máx. 60 peticiones / 60s
    ThrottlerModule.forRoot([
      { ttl: 60_000, limit: 60 },
    ]),

    // ==== MÓDULOS DE NEGOCIO ====
    CatalogModule,
    AnalyticsModule,
    AuthModule,
    UsersModule,
  ],
  providers: [
    // Aplica el rate-limit a toda la app
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
