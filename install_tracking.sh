#!/usr/bin/env bash
set -e
PROJ="myfilm-tracking-starter"
mkdir -p "$PROJ"/{api/prisma,api/src/modules/analytics,api/src/prisma,web/lib}
cd "$PROJ"

cat > api/package.json <<'EOF'
{
  "name": "myfilm-api",
  "private": true,
  "scripts": { "start:dev": "nest start --watch" },
  "dependencies": {
    "@nestjs/common": "^10.0.0","@nestjs/core": "^10.0.0","@nestjs/platform-express": "^10.0.0",
    "@nestjs/config": "^3.0.0","@nestjs/swagger": "^7.0.0","@nestjs/jwt": "^10.0.0",
    "@nestjs/cache-manager": "^2.2.0","@nestjs/bullmq": "^10.0.0","bullmq": "^5.9.0",
    "cache-manager-redis-store": "^3.0.1","axios": "^1.7.7","helmet": "^7.1.0",
    "reflect-metadata": "^0.1.13","rxjs": "^7.8.1","@prisma/client": "^5.20.0","zod": "^3.23.8"
  },
  "devDependencies": {
    "typescript": "^5.3.3","ts-node": "^10.9.2","tsconfig-paths": "^4.2.0",
    "@nestjs/cli": "^10.4.2","@nestjs/schematics": "^10.0.0","prisma": "^5.20.0"
  }
}
EOF

cat > api/.env.example <<'EOF'
DATABASE_URL="postgresql://user:pass@localhost:5432/myfilm?schema=public"
REDIS_URL="redis://localhost:6379"
BULL_PREFIX="myfilm"
PORT=3001
EOF

cat > api/prisma/schema.prisma <<'EOF'
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }
model Event {
  id        String   @id @default(uuid())
  ts        DateTime @default(now())
  type      String
  route     String
  referrer  String?  @db.VarChar(512)
  utm       Json?
  meta      Json?
  ua        String?  @db.VarChar(512)
  lang      String?  @db.VarChar(16)
  anonId    String?  @db.VarChar(64)
  userHash  String?  @db.VarChar(128)
  ipTrunc   String?  @db.VarChar(64)
  @@index([ts, route, type])
}
EOF

cat > api/src/main.ts <<'EOF'
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.setGlobalPrefix('v1');
  const config = new DocumentBuilder().setTitle('MYFILM API').setVersion('1.0.0').build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
  await app.listen(process.env.PORT || 3001);
}
bootstrap();
EOF

cat > api/src/app.module.ts <<'EOF'
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AnalyticsModule } from './modules/analytics/analytics.module';
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
EOF

cat > api/src/prisma/prisma.service.ts <<'EOF'
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
EOF

cat > api/src/modules/analytics/analytics.module.ts <<'EOF'
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsProcessor } from './analytics.processor';
import { PrismaService } from '../../prisma/prisma.service';
@Module({
  imports: [BullModule.registerQueue({ name: 'analytics' })],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsProcessor, PrismaService],
})
export class AnalyticsModule {}
EOF

cat > api/src/modules/analytics/analytics.controller.ts <<'EOF'
import { Body, Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private svc: AnalyticsService) {}
  @Post()
  @HttpCode(204)
  async ingest(@Req() req: any, @Headers('user-agent') ua: string, @Body() dto: any) {
    const ip = (req.headers['x-forwarded-for'] ?? req.socket?.remoteAddress ?? '') as string;
    await this.svc.enqueue({
      ts: new Date(),
      type: String(dto?.type ?? ''),
      route: String(dto?.route ?? ''),
      referrer: dto?.referrer?.slice(0,512) ?? null,
      utm: dto?.utm ?? null,
      meta: dto?.payload ?? null,
      ua: ua?.slice(0,512) ?? null,
      lang: dto?.lang ?? null,
      anonId: dto?.anonId ?? null,
      userHash: dto?.userHash ?? null,
      ipTrunc: ip.replace(/(\d+\.\d+)\.\d+\.\d+/, '$1.0.0')
    });
  }
}
EOF

cat > api/src/modules/analytics/analytics.service.ts <<'EOF'
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
@Injectable()
export class AnalyticsService {
  constructor(@InjectQueue('analytics') private q: Queue) {}
  enqueue(e: any) { return this.q.add('store', e, { removeOnComplete: 1000, removeOnFail: 100 }); }
}
EOF

cat > api/src/modules/analytics/analytics.processor.ts <<'EOF'
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { PrismaService } from '../../prisma/prisma.service';
@Processor('analytics')
export class AnalyticsProcessor extends WorkerHost {
  constructor(private prisma: PrismaService) { super(); }
  async process(job: any) {
    await this.prisma.event.create({ data: job.data });
    return true;
  }
}
EOF

cat > api/README.md <<'EOF'
# MYFILM API — Analytics Starter
Pasos:
1) cp .env.example .env  (rellena Postgres y Redis)
2) npm i
3) npx prisma generate && npx prisma migrate dev -n init_analytics
4) npm run start:dev
Probar:
curl -X POST http://localhost:3001/v1/analytics \
  -H "Content-Type: application/json" \
  -d '{"type":"pageview","route":"/home","payload":{"el":"test"}}' -i
EOF

cat > web/lib/analytics.ts <<'EOF'
// Cliente de tracking para Next.js (sendBeacon + consentimiento)
export function track(type: string, payload: any = {}) {
  if (typeof window === 'undefined') return;
  if (!(window as any).MYFILM_CONSENT?.analytics) return;
  const body = JSON.stringify({
    type, payload,
    route: location.pathname,
    referrer: document.referrer,
    lang: navigator.language,
  });
  navigator.sendBeacon('/v1/analytics', new Blob([body], { type: 'application/json' }));
}
EOF

cat > web/README.md <<'EOF'
# MYFILM Web — Analytics Client
Uso:
import { track } from './lib/analytics';
if (typeof window !== 'undefined') (window as any).MYFILM_CONSENT = { analytics: true };
track('pageview');
track('click', { el:'MovieCard', id:'movie:123' });
EOF

echo "✅ Proyecto creado en $(pwd)/$PROJ"
echo "➡  Siguiente:"
echo "cd $PROJ/api && cp .env.example .env && npm i && npx prisma generate && npx prisma migrate dev -n init_analytics && npm run start:dev"