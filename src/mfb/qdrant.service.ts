// src/mfb/qdrant.service.ts
import { Injectable } from '@nestjs/common';

export type QdrantProfile = {
  tmdb_id: number;
  title_id: number;
  profile_type: string;
  slot?: number;
  year?: number;
  vector: number[];
};

export type QdrantHit = {
  tmdb_id: number;
  score: number;
  title?: string;
  year?: number;
  profile_type?: string;
};

type QdrantSearchResponse = {
  result: Array<{
    id: string | number;
    score: number;
    payload?: any;
  }>;
};

type QdrantScrollResponse = {
  result: {
    points: Array<{
      id: string | number;
      payload?: any;
      vector?: number[] | Record<string, number[]>;
    }>;
    next_page_offset?: string | number | null;
  };
};

@Injectable()
export class QdrantService {
  // --- concurrency limiter (evita picos y timeouts contra Qdrant) ---
  private static __inFlight = 0;
  private static __waiters: Array<() => void> = [];

  private async __acquireQdrantSlot(): Promise<void> {
    const limit = Number(process.env.QDRANT_CONCURRENCY || 3);
    if (!Number.isFinite(limit) || limit <= 0) return;

    if (QdrantService.__inFlight < limit) {
      QdrantService.__inFlight += 1;
      return;
    }

    await new Promise<void>((resolve) => {
      QdrantService.__waiters.push(() => {
        QdrantService.__inFlight += 1;
        resolve();
      });
    });
  }

  private __releaseQdrantSlot(): void {
    const limit = Number(process.env.QDRANT_CONCURRENCY || 3);
    if (!Number.isFinite(limit) || limit <= 0) return;

    QdrantService.__inFlight = Math.max(0, QdrantService.__inFlight - 1);
    const next = QdrantService.__waiters.shift();
    if (next) next();
  }
  // --- end limiter ---

  private readonly url = process.env.QDRANT_URL!;
  private readonly apiKey = process.env.QDRANT_API_KEY!;
  private readonly collection = process.env.QDRANT_COLLECTION ?? 'title_profiles_v2';

  private headers() {
    return {
      'Content-Type': 'application/json',
      'api-key': this.apiKey,
    };
  }
  private async post<T>(path: string, body: any): Promise<T> {
        await this.__acquireQdrantSlot();
// Normaliza base URL (quita / finales)
    const base = (this.url || '').replace(/\/+$/, '');
    const url = `${base}${path}`;

    // Ajustes por ENV (se pueden tunear sin redeploy si usas --update-env)
    const MAX_RETRIES = Number(process.env.QDRANT_MAX_RETRIES || 3);
    const TIMEOUT_MS  = Number(process.env.QDRANT_TIMEOUT_MS  || 12000); // 12s
    const BACKOFF_MS  = Number(process.env.QDRANT_BACKOFF_MS  || 400);

    let lastErr: any = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const r = await fetch(url, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!r.ok) {
          const txt = await r.text().catch(() => '');

          const retryable =
            r.status === 429 ||
            r.status === 408 ||
            r.status === 504 ||
            r.status >= 500;

          if (retryable && attempt < MAX_RETRIES) {
            const wait = Math.min(8000, BACKOFF_MS * Math.pow(2, attempt));
            await new Promise((res) => setTimeout(res, wait));
            continue;
          }

          throw new Error(`Qdrant HTTP ${r.status}: ${txt.slice(0, 200)}`);
        }

        return (await r.json()) as T;
      } catch (e: any) {
        lastErr = e;

        if (attempt < MAX_RETRIES) {
          const wait = Math.min(8000, BACKOFF_MS * Math.pow(2, attempt));
          await new Promise((res) => setTimeout(res, wait));
          continue;
        }

        throw e;
      } finally {
        clearTimeout(timer);
        this.__releaseQdrantSlot();
      }
    }

    throw lastErr;
  }

  private pickVector(v: any): number[] | null {
    // Qdrant puede devolver:
    // - vector: number[]
    // - vector: { default: number[] } o { <name>: number[] }
    if (!v) return null;
    if (Array.isArray(v)) return v;
    if (typeof v === 'object') {
      if (Array.isArray(v.default)) return v.default;
      const firstKey = Object.keys(v)[0];
      if (firstKey && Array.isArray(v[firstKey])) return v[firstKey];
    }
    return null;
  }

  /**
   * Devuelve TODOS los perfiles (puntos) de un título.
   * Usa scroll por payload.title_id = titleId y devuelve también el vector.
   */
  async getProfilesForTitle(titleId: number): Promise<QdrantProfile[]> {
    const out: QdrantProfile[] = [];
    let offset: string | number | null | undefined = null;

    // solemos tener ~10 perfiles por título, con 64 va sobrado
    for (let guard = 0; guard < 8; guard++) {
      const body: any = {
        limit: 64,
        with_payload: true,
        with_vector: true,
        filter: {
          must: [{ key: 'title_id', match: { value: titleId } }],
        },
      };
      if (offset !== null && offset !== undefined) body.offset = offset;

      const resp = await this.post<QdrantScrollResponse>(
        `/collections/${this.collection}/points/scroll`,
        body,
      );

      const points = resp?.result?.points ?? [];
      for (const p of points) {
        const payload = p.payload ?? {};
        const vector = this.pickVector(p.vector);
        if (!vector) continue;

        out.push({
          tmdb_id: Number(payload.tmdb_id ?? 0),
          title_id: Number(payload.title_id ?? 0),
          profile_type: String(payload.profile_type ?? ''),
          slot: payload.slot != null ? Number(payload.slot) : undefined,
          year: payload.year != null ? Number(payload.year) : undefined,
          vector,
        });
      }

      offset = resp?.result?.next_page_offset;
      if (offset === null || offset === undefined) break;
    }

    return out
      .filter((p) => p.title_id === titleId && p.tmdb_id > 0 && p.profile_type && p.vector?.length)
      .sort((a, b) => (a.slot ?? 999) - (b.slot ?? 999));
  }

  /**
   * Búsqueda por vector dentro de un profile_type concreto.
   * Devuelve candidatos con score + payload.
   */
  async searchByVector(opts: {
    vector: number[];
    profileType: string;
    excludeTmdbId: number;
    limit: number;
    year?: number;
  }): Promise<QdrantHit[]> {
    const must: any[] = [{ key: 'profile_type', match: { value: opts.profileType } }];

    // (Opcional) filtro suave por año (±20) para evitar ruido extremo.
    // OJO: si tu año no existe en payload, esto no filtra nada.
    if (opts.year && Number.isFinite(opts.year)) {
      must.push({
        key: 'year',
        range: { gte: opts.year - 20, lte: opts.year + 20 },
      });
    }

    const body = {
      vector: opts.vector,
      limit: opts.limit,
      with_payload: true,
      filter: {
        must,
        must_not: [{ key: 'tmdb_id', match: { value: opts.excludeTmdbId } }],
      },
    };

    const resp = await this.post<QdrantSearchResponse>(
      `/collections/${this.collection}/points/search`,
      body,
    );

    const hits = resp?.result ?? [];
    return hits
      .map((h) => {
        const p = h.payload ?? {};
        return {
          tmdb_id: Number(p.tmdb_id ?? 0),
          score: Number(h.score ?? 0),
          title: p.title ? String(p.title) : undefined,
          year: p.year != null ? Number(p.year) : undefined,
          profile_type: p.profile_type ? String(p.profile_type) : undefined,
        } as QdrantHit;
      })
      .filter((x) => x.tmdb_id > 0);
  }
}