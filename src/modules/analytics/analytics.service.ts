import { Injectable } from '@nestjs/common';

export type EventType = 'view' | 'click' | 'scroll' | 'search' | 'play';

export interface AnalyticsEvent {
  ts: Date;
  type: EventType | string;
  route: string;
  referrer?: string | null;
  utm?: any;
  meta?: any;
  ua?: string | null;
  lang?: string | null;
  anonId?: string | null;
  userHash?: string | null;
  ipTrunc?: string | null;
}

@Injectable()
export class AnalyticsService {
  // buffer circular de 50k eventos (evita crecer infinito)
  private readonly MAX = 50_000;
  private buf: AnalyticsEvent[] = [];
  private head = 0;

  enqueue(ev: AnalyticsEvent) {
    if (this.buf.length < this.MAX) {
      this.buf.push(ev);
    } else {
      this.buf[this.head] = ev;
      this.head = (this.head + 1) % this.MAX;
    }

    if (process.env.APP_ENV !== 'production') {
      // console.log('[analytics]', ev.type, ev.route, ev.referrer ?? '');
    }
  }

  /** métricas muy rápidas para el panel */
  stats(limit = 1000) {
    const list = this.latest(limit);
    const byRoute: Record<string, number> = {};
    const byType: Record<string, number> = {};

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

  /** devuelve los últimos N eventos (por defecto 100) */
  latest(n = 100) {
    const all =
      this.buf.length < this.MAX
        ? this.buf
        : [...this.buf.slice(this.head), ...this.buf.slice(0, this.head)];

    return all.slice(-n).reverse();
  }

  /** limpia el buffer (solo desarrollo/QA) */
  flush() {
    this.buf = [];
    this.head = 0;
    return { ok: true };
  }
}
