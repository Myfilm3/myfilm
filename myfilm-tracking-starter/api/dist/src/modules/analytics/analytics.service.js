"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
let AnalyticsService = class AnalyticsService {
    constructor() {
        this.MAX = 50_000;
        this.buf = [];
        this.head = 0;
    }
    enqueue(ev) {
        if (this.buf.length < this.MAX) {
            this.buf.push(ev);
        }
        else {
            this.buf[this.head] = ev;
            this.head = (this.head + 1) % this.MAX;
        }
        if (process.env.APP_ENV !== 'production') {
        }
    }
    stats(limit = 1000) {
        const list = this.latest(limit);
        const byRoute = {};
        const byType = {};
        for (const e of list) {
            byRoute[e.route] = (byRoute[e.route] || 0) + 1;
            byType[e.type] = (byType[e.type] || 0) + 1;
        }
        return {
            count: list.length,
            byType: Object.entries(byType).sort((a, b) => b[1] - a[1]),
            topRoutes: Object.entries(byRoute)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 20),
            sample: list.slice(0, 20),
        };
    }
    latest(n = 100) {
        const all = this.buf.length < this.MAX
            ? this.buf
            : [...this.buf.slice(this.head), ...this.buf.slice(0, this.head)];
        return all.slice(-n).reverse();
    }
    flush() {
        this.buf = [];
        this.head = 0;
        return { ok: true };
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)()
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map