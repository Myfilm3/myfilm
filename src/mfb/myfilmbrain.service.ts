// src/mfb/myfilmbrain.service.ts
import { Injectable } from '@nestjs/common';
import { QdrantService } from './qdrant.service';
import { TmdbService, TmdbAny } from './tmdb.service';

export type MfbRec = {
  tmdb_id: number;
  score: number;
  title?: string;
  year?: number;
  poster_path?: string | null;
  backdrop_path?: string | null;
  source_bucket?: string;
};

// =========================
// Utils
// =========================

function decadeOf(date?: string): number | null {
  const y = date ? Number(date.slice(0, 4)) : NaN;
  if (!Number.isFinite(y)) return null;
  return Math.floor(y / 10) * 10;
}

function overlapCount(a: number[] = [], b: number[] = []) {
  const set = new Set(a);
  let c = 0;
  for (const x of b) if (set.has(x)) c++;
  return c;
}

function keywordOverlap(seed: Set<string>, cand: string[]) {
  let c = 0;
  for (const k of cand) if (seed.has(k)) c++;
  return c;
}

function tmdbYear(t: TmdbAny): number | undefined {
  const y =
    t.release_date
      ? Number(t.release_date.slice(0, 4))
      : t.first_air_date
      ? Number(t.first_air_date.slice(0, 4))
      : undefined;
  return Number.isFinite(y) ? y : undefined;
}

// pequeño hash determinista -> [0,1)
function hash01(a: number, b: number) {
  // xorshift-ish
  let x = (a ^ (b * 2654435761)) >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return (x >>> 0) / 0xffffffff;
}

// =========================
// EXP mix mapping (1..10)
// =========================
const MIX_MAP: Record<number, string> = {
  1: 'theme',
  2: 'mood',
  3: 'pace',
  4: 'tone',
  5: 'visual',
  6: 'depth',
  7: 'tension',
  8: 'emotion',
  9: 'target',
  10: 'experience',
};

function parseMix(mix: string): string[] {
  const parts = mix
    .split(/[^0-9]+/g)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 10);

  const uniq: number[] = [];
  for (const n of parts) if (!uniq.includes(n)) uniq.push(n);

  const mapped = uniq.map((n) => MIX_MAP[n]).filter(Boolean);
  return mapped.length ? mapped : ['theme', 'mood', 'experience'];
}

// =========================
// ✅ Perfilado por género (lo importante)
// =========================

// TMDB genre ids útiles
const G = {
  ACTION: 28,
  ADVENTURE: 12,
  ANIMATION: 16,
  COMEDY: 35,
  CRIME: 80,
  DOCUMENTARY: 99,
  DRAMA: 18,
  FAMILY: 10751,
  FANTASY: 14,
  HISTORY: 36,
  HORROR: 27,
  MUSIC: 10402,
  MYSTERY: 9648,
  ROMANCE: 10749,
  SCIFI: 878,
  THRILLER: 53,
  WAR: 10752,
  WESTERN: 37,
};

type ProfilePlan = Array<{ type: string; weight: number }>;

function hasAny(genres: number[], wanted: number[]) {
  return wanted.some((g) => genres.includes(g));
}

/**
 * Devuelve un plan (perfiles + pesos) basado en géneros TMDB.
 * Esto ES lo que hará que Origen empuje hacia Interstellar/Tenet:
 * - SciFi/Thriller/Mystery => depth+tension+pace+theme+visual+experience (mood pesa menos)
 */
function buildPlanFromGenres(seedGenres: number[], seedIsKids: boolean): ProfilePlan {
  // Kids: evitar recomendar “adulto” por embeddings densos
  if (seedIsKids) {
    return [
      { type: 'target', weight: 1.3 },
      { type: 'mood', weight: 1.1 },
      { type: 'emotion', weight: 1.0 },
      { type: 'visual', weight: 0.9 },
      { type: 'experience', weight: 0.8 },
      { type: 'theme', weight: 0.6 },
    ];
  }

  // SCI-FI / MYSTERY / THRILLER (Origen, Tenet, Interstellar, etc.)
  if (hasAny(seedGenres, [G.SCIFI, G.MYSTERY, G.THRILLER])) {
    return [
      { type: 'depth', weight: 1.35 },
      { type: 'tension', weight: 1.20 },
      { type: 'pace', weight: 1.10 },
      { type: 'theme', weight: 1.00 },
      { type: 'visual', weight: 0.95 },
      { type: 'experience', weight: 0.90 },
      { type: 'tone', weight: 0.70 },
      { type: 'mood', weight: 0.55 }, // mood NO domina en sci-fi cerebral
    ];
  }

  // DRAMA / HISTORY / WAR / BIOPIC-ish (Imitation Game etc.)
  if (hasAny(seedGenres, [G.DRAMA, G.HISTORY, G.WAR])) {
    return [
      { type: 'theme', weight: 1.20 },
      { type: 'depth', weight: 1.15 },
      { type: 'emotion', weight: 1.05 },
      { type: 'tone', weight: 0.95 },
      { type: 'experience', weight: 0.85 },
      { type: 'pace', weight: 0.75 },
      { type: 'mood', weight: 0.70 },
      { type: 'visual', weight: 0.55 },
    ];
  }

  // COMEDY
  if (seedGenres.includes(G.COMEDY)) {
    return [
      { type: 'mood', weight: 1.30 },
      { type: 'pace', weight: 1.05 },
      { type: 'emotion', weight: 0.95 },
      { type: 'target', weight: 0.90 },
      { type: 'experience', weight: 0.80 },
      { type: 'theme', weight: 0.65 },
    ];
  }

  // HORROR
  if (seedGenres.includes(G.HORROR)) {
    return [
      { type: 'tension', weight: 1.35 },
      { type: 'tone', weight: 1.15 },
      { type: 'mood', weight: 1.00 },
      { type: 'visual', weight: 0.90 },
      { type: 'theme', weight: 0.80 },
      { type: 'experience', weight: 0.75 },
      { type: 'depth', weight: 0.55 },
    ];
  }

  // Default general
  return [
    { type: 'theme', weight: 1.10 },
    { type: 'experience', weight: 1.00 },
    { type: 'mood', weight: 0.95 },
    { type: 'pace', weight: 0.85 },
    { type: 'tone', weight: 0.75 },
    { type: 'visual', weight: 0.70 },
    { type: 'depth', weight: 0.60 },
    { type: 'emotion', weight: 0.55 },
  ];
}

// =========================
// Weighted RRF
// =========================
function rrfAddWeighted(
  map: Map<number, { rrf: number; buckets: Set<string> }>,
  id: number,
  rank: number,
  bucket: string,
  weight: number,
  k = 60,
) {
  const cur = map.get(id) ?? { rrf: 0, buckets: new Set<string>() };
  cur.rrf += (weight * 1) / (k + rank);
  cur.buckets.add(bucket);
  map.set(id, cur);
}

// =========================
// Diversificación (anti “siempre las mismas”)
// =========================
function diversify<T extends { tmdb_id: number; score: number; _decade?: number | null; _g?: number[] }>(
  items: T[],
  limit: number,
) {
  const picked: T[] = [];
  const usedDecade = new Map<number, number>();
  const usedGenre = new Map<number, number>();

  for (const it of items) {
    if (picked.length >= limit) break;

    const decade = it._decade ?? null;
    const gs = it._g ?? [];

    // caps suaves: no más de X por década y por “género principal”
    if (decade !== null) {
      const c = usedDecade.get(decade) ?? 0;
      if (c >= 6) continue;
    }

    // penaliza sobre-repetición de géneros (siempre “sci-fi thriller”)
    let tooMuch = false;
    for (const g of gs.slice(0, 3)) {
      const c = usedGenre.get(g) ?? 0;
      if (c >= 10) {
        tooMuch = true;
        break;
      }
    }
    if (tooMuch) continue;

    picked.push(it);
    if (decade !== null) usedDecade.set(decade, (usedDecade.get(decade) ?? 0) + 1);
    for (const g of gs.slice(0, 3)) usedGenre.set(g, (usedGenre.get(g) ?? 0) + 1);
  }

  // si por caps nos quedamos cortos, rellena
  if (picked.length < limit) {
    for (const it of items) {
      if (picked.length >= limit) break;
      if (!picked.find((x) => x.tmdb_id === it.tmdb_id)) picked.push(it);
    }
  }

  return picked.slice(0, limit);
}

// =========================
// Service
// =========================

@Injectable()
export class MyFilmBrainService {
  constructor(
    private readonly qdrant: QdrantService,
    private readonly tmdb: TmdbService,
  ) {}

  // =====================================================
  // ✅ V2 (PRODUCCIÓN) - mejorada
  // - plan por género
  // - weighted RRF
  // - más candidatos
  // - diversificación
  // =====================================================
  async recommendByTitleIdV2(titleId: number, limit = 22) {
    const t0 = Date.now();

    const seed = await this.tmdb.titleAny(titleId);
    if (!seed) {
      return { titleId, count: 0, results: [] as MfbRec[] };
    }

    const seedTitle =
      seed.title ?? seed.name ?? seed.original_title ?? seed.original_name ?? '';

    const seedYear = tmdbYear(seed);
    const seedDecade = decadeOf(seed.release_date ?? seed.first_air_date);

    const seedGenres = (seed.genres ?? []).map((g) => g.id);
    const seedKeywords = new Set((seed._keywords ?? []).map((k) => k.toLowerCase()));

    const GENRE_ANIMATION = 16;
    const GENRE_FAMILY = 10751;
    const seedIsKids = seedGenres.includes(GENRE_ANIMATION) || seedGenres.includes(GENRE_FAMILY);

    // ✅ Plan por género
    const plan = buildPlanFromGenres(seedGenres, seedIsKids);
    const planTypes = new Set(plan.map((p) => p.type));

    const profiles = await this.qdrant.getProfilesForTitle(titleId);

    // ✅ Solo perfiles que están en el plan (y con vector)
    let usedProfiles = profiles
      .filter((p) => p.profile_type && planTypes.has(String(p.profile_type)))
      .filter((p) => Array.isArray(p.vector) && p.vector.length)
      .slice(0, 12);

    // fallback: si por lo que sea faltan, volvemos a “lo que haya”
    if (!usedProfiles.length) {
      usedProfiles = profiles
        .filter((p) => p.profile_type && Array.isArray(p.vector) && p.vector.length)
        .slice(0, 10);
    }

    if (!usedProfiles.length) {
      return { titleId, count: 0, results: [] as MfbRec[] };
    }

    // weight lookup
    const wOf = (type: string) => plan.find((p) => p.type === type)?.weight ?? 0.75;

    // ✅ pool más grande
    const perProfileLimit = 240;

    // ✅ NOTA: el filtro de año puede matar “parecidas” si el seed es viejo
    // en cine cerebral (Origen) NO lo quiero duro. Lo dejo solo si hay seedYear y no es kids.
    const yearFilter = !seedIsKids ? seedYear ?? undefined : undefined;

    const searches = await Promise.all(
      usedProfiles.map(async (p) => {
        const bucket = String(p.profile_type);
        const hits = await this.qdrant.searchByVector({
          vector: p.vector,
          profileType: bucket,
          excludeTmdbId: titleId,
          limit: perProfileLimit,
          year: yearFilter,
        });
        return { bucket, weight: wOf(bucket), hits };
      }),
    );

    // ✅ fused weighted RRF
    const fused = new Map<number, { rrf: number; buckets: Set<string> }>();
    for (const { bucket, weight, hits } of searches) {
      hits.forEach((h, idx) => rrfAddWeighted(fused, h.tmdb_id, idx + 1, bucket, weight, 60));
    }

    // ✅ más candidatos para que entren “los obvios” (Interstellar etc.)
    const candidateIds = [...fused.entries()]
      .sort((a, b) => b[1].rrf - a[1].rrf)
      .map(([id]) => id)
      .slice(0, 350);

    const enriched = await this.tmdb.enrichMany(candidateIds.slice(0, 180), 6);
    const byId = new Map<number, TmdbAny>();
    enriched.forEach((t) => byId.set(t.id, t));

    // ✅ Reranking “cinéfilo” (tu base + mejoras pequeñas)
    const reranked = candidateIds
      .map((id) => {
        const meta = byId.get(id);
        if (!meta) return null;

        const candGenres = (meta.genres ?? []).map((g) => g.id);
        const gOverlap = overlapCount(seedGenres, candGenres);

        // Si seed tiene géneros, exigimos algo de overlap (pero no hiper estricto)
        if (seedGenres.length && gOverlap === 0) return null;

        // Kids safety
        const candIsKids =
          candGenres.includes(GENRE_ANIMATION) || candGenres.includes(GENRE_FAMILY);
        if (!seedIsKids && candIsKids) return null;

        const candKeywords = (meta._keywords ?? []).map((k) => k.toLowerCase());
        const kwOverlap = keywordOverlap(seedKeywords, candKeywords);

        // ✅ bonifica keywords pero sin pasarse
        const kwBonus = Math.min(2.0, kwOverlap * 0.45);

        const candDecade = decadeOf(meta.release_date ?? meta.first_air_date);
        const decadeDelta =
          seedDecade !== null && candDecade !== null ? Math.abs(seedDecade - candDecade) : null;

        const decadeBonus =
          decadeDelta !== null && decadeDelta <= 10
            ? 0.22
            : decadeDelta !== null && decadeDelta <= 20
            ? 0.10
            : 0;

        const pop = Number(meta.popularity ?? 0);
        const popularityBonus = pop ? Math.min(0.22, Math.log10(1 + pop) * 0.07) : 0;

        const base = fused.get(id)?.rrf ?? 0;
        const genreBonus = Math.min(3, gOverlap) * 0.28;

        // ✅ micro-jitter determinista para romper empates (no random real)
        const jitter = (hash01(titleId, id) - 0.5) * 0.006; // ±0.003

        const finalScore = base + genreBonus + kwBonus + decadeBonus + popularityBonus + jitter;

        return {
          tmdb_id: id,
          score: finalScore,
          title: meta.title ?? meta.name,
          year: tmdbYear(meta),
          poster_path: meta.poster_path ?? null,
          backdrop_path: meta.backdrop_path ?? null,
          source_bucket: [...(fused.get(id)?.buckets ?? new Set<string>())].sort().join('+'),

          // para diversificación
          _decade: candDecade,
          _g: candGenres,
        };
      })
      .filter(Boolean) as any[];

    // ✅ primero orden por score…
    const ordered = reranked.sort((a, b) => b.score - a.score);

    // ✅ …y luego diversificación para evitar “clones”
    const diversified = diversify(ordered, limit);

    const results: MfbRec[] = diversified.map((r: any) => ({
      tmdb_id: r.tmdb_id,
      score: Number(r.score.toFixed(6)),
      title: r.title,
      year: r.year,
      poster_path: r.poster_path,
      backdrop_path: r.backdrop_path,
      source_bucket: r.source_bucket,
    }));

    return {
      titleId,
      count: results.length,
      results,
      debug: {
        ms: Date.now() - t0,
        seedTitle,
        seedYear,
        seedDecade,
        seedGenres,
        seedKeywordsCount: seedKeywords.size,
        plan: plan.map((p) => `${p.type}:${p.weight}`),
        usedProfiles: usedProfiles.map((p) => p.profile_type),
      },
    };
  }

  // =====================================================
  // 🧪 EXPERIMENTAL GENÉRICO (lo dejamos, pero mejorado)
  // - más limit
  // - weighted RRF según mix (todos peso=1)
  // =====================================================
  async recommendByTitleId_ExperimentMix(titleId: number, limit = 22, mix = '1-2-10') {
    const t0 = Date.now();

    const wanted = parseMix(mix);
    const profiles = await this.qdrant.getProfilesForTitle(titleId);

    const usedProfiles = profiles.filter(
      (p) =>
        p.profile_type &&
        wanted.includes(String(p.profile_type)) &&
        Array.isArray(p.vector) &&
        p.vector.length,
    );

    if (!usedProfiles.length) {
      return {
        titleId,
        count: 0,
        results: [],
        debug: {
          ms: Date.now() - t0,
          mix,
          wanted,
          usedProfiles: [],
          mode: 'EXPERIMENT_GENERIC',
        },
      };
    }

    const searches = await Promise.all(
      usedProfiles.map(async (p) => {
        const hits = await this.qdrant.searchByVector({
          vector: p.vector,
          profileType: String(p.profile_type),
          excludeTmdbId: titleId,
          limit: 240,
        });
        return { bucket: String(p.profile_type), hits };
      }),
    );

    const fused = new Map<number, { rrf: number; buckets: Set<string> }>();
    for (const { bucket, hits } of searches) {
      hits.forEach((h, idx) => {
        rrfAddWeighted(fused, h.tmdb_id, idx + 1, bucket, 1.0, 60);
      });
    }

    const results = [...fused.entries()]
      .sort((a, b) => b[1].rrf - a[1].rrf)
      .slice(0, limit)
      .map(([tmdb_id, v]) => ({
        tmdb_id,
        score: Number(v.rrf.toFixed(6)),
        source_bucket: [...v.buckets].sort().join('+'),
      }));

    return {
      titleId,
      count: results.length,
      results,
      debug: {
        ms: Date.now() - t0,
        mix,
        wanted,
        usedProfiles: usedProfiles.map((p) => p.profile_type),
        mode: 'EXPERIMENT_GENERIC',
      },
    };
  }
}