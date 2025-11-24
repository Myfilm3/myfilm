import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private svc: AnalyticsService) {}

  // Utilidad: normaliza y anonimiza IP (IPv4/IPv6)
  private anonymizeIp(ipRaw: string | undefined): string | null {
    if (!ipRaw) return null;
    const ip = String(ipRaw).split(',')[0].trim(); // por si viene lista x-forwarded-for

    // localhost ipv6
    if (ip === '::1') return '::1';

    // IPv4 → a.b.0.0
    const m4 = /^(\d+)\.(\d+)\.\d+\.\d+$/.exec(ip);
    if (m4) return `${m4[1]}.${m4[2]}.0.0`;

    // IPv6 → primeras 4 hextets + ::
    const m6 = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/.exec(ip);
    if (m6) {
      const parts = ip.split(':');
      return `${parts.slice(0, 4).join(':')}::`;
    }

    // fallback
    return null;
  }

  // 🔹 Recibe eventos del frontend (pageview, click, search, etc.)
  @Post()
  @HttpCode(204)
  @ApiBody({
    description: 'Evento de analítica enviado por el frontend',
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', example: 'view' },
        route: { type: 'string', example: '/movie/123' },
        referrer: {
          type: 'string',
          nullable: true,
          example: 'https://myfilm.es/home',
        },
        lang: { type: 'string', nullable: true, example: 'es' },
        anonId: { type: 'string', nullable: true, example: 'anon-abc123' },
        userHash: { type: 'string', nullable: true, example: 'u_9d8f...' },
        payload: {
          type: 'object',
          nullable: true,
          example: { title: 'Frankenstein' },
        },
        utm: {
          type: 'object',
          nullable: true,
          example: { source: 'instagram', campaign: 'launch' },
        },
      },
      required: ['type', 'route'],
    },
    examples: {
      view: {
        value: {
          type: 'view',
          route: '/movie/123',
          referrer: 'https://myfilm.es/home',
          lang: 'es',
          payload: { title: 'Frankenstein' },
        },
      },
    },
  })
  async ingest(
    @Req() req: any,
    @Headers('user-agent') ua: string,
    @Body() dto: any,
  ) {
    const ip =
      (req.headers['x-forwarded-for'] as string) ??
      req.socket?.remoteAddress ??
      '';

    this.svc.enqueue({
      ts: new Date(),
      type: String(dto?.type ?? '').slice(0, 32),
      route: String(dto?.route ?? '').slice(0, 512),
      referrer: dto?.referrer?.slice?.(0, 512) ?? null,
      utm: dto?.utm ?? null,
      meta: dto?.payload ?? null,
      ua: ua?.slice?.(0, 512) ?? null,
      lang: dto?.lang?.slice?.(0, 16) ?? null,
      anonId: dto?.anonId?.slice?.(0, 64) ?? null,
      userHash: dto?.userHash?.slice?.(0, 128) ?? null,
      ipTrunc: this.anonymizeIp(ip),
    });
  }

  // 🔹 Métricas rápidas para panel
  @Get('stats')
  getStats() {
    return this.svc.stats(5000);
  }

  // 🔹 Últimos N eventos (por defecto 100, máx 1000)
  @Get('latest')
  latest(@Query('limit') limit = '100') {
    const n = Math.min(Math.max(parseInt(limit || '100', 10) || 100, 1), 1000);
    return this.svc.latest(n);
  }

  // 🔹 “Botón rojo” para limpiar buffer (deshabilitado en producción)
  @Delete('flush')
  flush() {
    if ((process.env.APP_ENV || '').toLowerCase() === 'production') {
      throw new ForbiddenException('Flush no permitido en producción');
    }
    return this.svc.flush();
  }
}
