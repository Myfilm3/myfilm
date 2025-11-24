"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const analytics_service_1 = require("./analytics.service");
let AnalyticsController = class AnalyticsController {
    constructor(svc) {
        this.svc = svc;
    }
    anonymizeIp(ipRaw) {
        if (!ipRaw)
            return null;
        const ip = String(ipRaw).split(',')[0].trim();
        if (ip === '::1')
            return '::1';
        const m4 = /^(\d+)\.(\d+)\.\d+\.\d+$/.exec(ip);
        if (m4)
            return `${m4[1]}.${m4[2]}.0.0`;
        const m6 = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/.exec(ip);
        if (m6) {
            const parts = ip.split(':');
            return `${parts.slice(0, 4).join(':')}::`;
        }
        return null;
    }
    async ingest(req, ua, dto) {
        const ip = req.headers['x-forwarded-for'] ??
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
    getStats() {
        return this.svc.stats(5000);
    }
    latest(limit = '100') {
        const n = Math.min(Math.max(parseInt(limit || '100', 10) || 100, 1), 1000);
        return this.svc.latest(n);
    }
    flush() {
        if ((process.env.APP_ENV || '').toLowerCase() === 'production') {
            throw new common_1.ForbiddenException('Flush no permitido en producción');
        }
        return this.svc.flush();
    }
};
exports.AnalyticsController = AnalyticsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(204),
    (0, swagger_1.ApiBody)({
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
    }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)('user-agent')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "ingest", null);
__decorate([
    (0, common_1.Get)('stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('latest'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "latest", null);
__decorate([
    (0, common_1.Delete)('flush'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "flush", null);
exports.AnalyticsController = AnalyticsController = __decorate([
    (0, swagger_1.ApiTags)('analytics'),
    (0, common_1.Controller)('analytics'),
    __metadata("design:paramtypes", [analytics_service_1.AnalyticsService])
], AnalyticsController);
//# sourceMappingURL=analytics.controller.js.map