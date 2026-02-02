ø// scripts/related_worker.js
// Worker para precalcular "Relacionadas" (top_k=22) usando Qdrant (title_profiles_v2)
// donde cada título tiene 10 puntos (slot 0..9) con profile_type distinto.
// Cachea en MySQL (mfb_related_cache).
//
// Run:
//   pm2 delete related-worker --force || true
//   pm2 start /var/www/_src_myfilm/myfilm/scripts/related_worker.js --name related-worker --update-env
//   pm2 save
//   pm2 logs related-worker --lines 120

import mysql from "mysql2/promise";
import dotenv from "dotenv";

// ✅ cargar variables SIEMPRE desde un .env dedicado (y override para PM2)
dotenv.config({
  path: "/var/www/_src_myfilm/myfilm/.env.related",
  override: true,
});

/** -------------------------
 * ENV
 * ------------------------*/
const QDRANT_URL = (process.env.QDRANT_URL || "").replace(/\/+$/, "");
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || "";

const QDRANT_COLLECTION =
  process.env.QDRANT_COLLECTION ||
  process.env.QDRANT_COLLECTION_PROFILES_v2 ||
  "title_profiles_v2";

// MySQL
const MYSQL_HOST = process.env.MYSQL_HOST || "127.0.0.1";
const MYSQL_USER = process.env.MYSQL_USER || "";
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || "";
const MYSQL_DB = process.env.MYSQL_DB || "myfilm";
const MYSQL_PORT = Number(process.env.MYSQL_PORT || 3306);

// Worker settings
const TOP_K = Number(process.env.RELATED_TOP_K || 22);
const BATCH_SIZE = Number(process.env.RELATED_BATCH_SIZE || 50);
const SLEEP_MS = Number(process.env.RELATED_SLEEP_MS || 300);
const ALGO_VERSION = process.env.RELATED_ALGO_VERSION || "v2_avg10";
const MODEL = process.env.RELATED_MODEL || "title_profiles_v2";

// Qdrant settings
const EXPECTED_SLOTS = Number(process.env.RELATED_EXPECTED_SLOTS || 10); // 10 embeddings por título
const QDRANT_SCROLL_LIMIT = Number(process.env.RELATED_SCROLL_LIMIT || 32); // por si hay extras
const QDRANT_SEARCH_LIMIT = Number(process.env.RELATED_SEARCH_LIMIT || 300); // para poder agrupar y sacar 22 únicos

// Validaciones
if (!QDRANT_URL) {
  console.error("❌ Missing QDRANT_URL");
  process.exit(1);
}
if (!QDRANT_API_KEY) {
  console.error("❌ Missing QDRANT_API_KEY");
  process.exit(1);
}
if (!MYSQL_USER) {
  console.error("❌ Missing MYSQL_USER");
  process.exit(1);
}
if (!MYSQL_PASSWORD) {
  console.error("❌ Missing MYSQL_PASSWORD");
  process.exit(1);
}

/** -------------------------
 * Helpers
 * ------------------------*/
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function qdrantHeaders() {
  // En Qdrant Cloud, a veces vale "api-key" y a veces "Authorization: Bearer"
  // Enviamos ambos para evitar 401/403 por configuración.
  return {
    "Content-Type": "application/json",
    "api-key": QDRANT_API_KEY,
    Authorization: `Bearer ${QDRANT_API_KEY}`,
  };
}

function normalizeTipo(tipo) {
  if (!tipo) return "";
  const t = String(tipo).toLowerCase();
  if (t === "series") return "tv";
  if (t === "tvshow") return "tv";
  return t;
}

function extractVectorFromPoint(point) {
  if (!point) return null;

  // Qdrant puede devolver `vector` o `vectors`
  const v = point.vector ?? point.vectors ?? null;
  if (!v) return null;

  // Default vector: array
  if (Array.isArray(v)) return v;

  // Named vectors: objeto {name: [..]}
  if (typeof v === "object") {
    const firstKey = Object.keys(v)[0];
    if (firstKey && Array.isArray(v[firstKey])) return v[firstKey];
  }

  return null;
}

function meanVector(vectors) {
  if (!vectors?.length) return null;
  const dim = vectors[0]?.length || 0;
  if (!dim) return null;

  const acc = new Array(dim).fill(0);
  let count = 0;

  for (const vec of vectors) {
    if (!Array.isArray(vec) || vec.length !== dim) continue;
    for (let i = 0; i < dim; i++) acc[i] += vec[i];
    count++;
  }

  if (!count) return null;
  for (let i = 0; i < dim; i++) acc[i] /= count;
  return acc;
}

/** -------------------------
 * Qdrant: obtener los 10 puntos de un título
 * ------------------------*/
async function qdrantFetchTitlePoints({ tipo, tmdbId }) {
  // Traemos puntos por payload.type + payload.tmdb_id
  const res = await fetch(`${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points/scroll`, {
    method: "POST",
    headers: qdrantHeaders(),
    body: JSON.stringify({
      limit: QDRANT_SCROLL_LIMIT,
      with_payload: true,
      with_vector: true,
      filter: {
        must: [
          { key: "type", match: { value: tipo } },
          { key: "tmdb_id", match: { value: Number(tmdbId) } },
        ],
      },
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Qdrant scroll failed ${res.status}: ${txt}`);
  }

  const data = await res.json();
  const points = data?.result?.points || [];
  return points;
}

async function qdrantBuildTitleVector({ tipo, tmdbId }) {
  const points = await qdrantFetchTitlePoints({ tipo, tmdbId });

  if (!points.length) return { vector: null, meta: { points: 0, slots: 0 } };

  // Orden opcional por slot (si existe)
  points.sort((a, b) => {
    const sa = Number(a?.payload?.slot ?? 9999);
    const sb = Number(b?.payload?.slot ?? 9999);
    return sa - sb;
  });

  const vectors = [];
  const slotsSeen = new Set();

  for (const p of points) {
    const vec = extractVectorFromPoint(p);
    if (vec) vectors.push(vec);
    const slot = p?.payload?.slot;
    if (slot !== undefined && slot !== null) slotsSeen.add(Number(slot));
  }

  const merged = meanVector(vectors);

  return {
    vector: merged,
    meta: { points: points.length, slots: slotsSeen.size, dim: merged?.length || 0 },
  };
}

/** -------------------------
 * Qdrant: búsqueda y agrupación por tmdb_id
 * ------------------------*/
async function qdrantSearchSimilar({ vector, tipo, excludeTmdbId }) {
  const body = {
    vector,
    limit: QDRANT_SEARCH_LIMIT,
    with_payload: true,
    with_vector: false,
    filter: {
      must: [{ key: "type", match: { value: tipo } }],
      must_not: [{ key: "tmdb_id", match: { value: Number(excludeTmdbId) } }],
    },
  };

  const res = await fetch(`${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points/search`, {
    method: "POST",
    headers: qdrantHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Qdrant search failed ${res.status}: ${txt}`);
  }

  const data = await res.json();
  return data?.result || [];
}

function buildRelatedFromHits(hits, topK) {
  // Agrupar por tmdb_id, quedarnos con mejor score por título
  const bestByTmdb = new Map();

  for (const h of hits) {
    const payload = h?.payload || {};
    const tmdb_id = payload?.tmdb_id;
    const type = payload?.type;
    if (tmdb_id == null) continue;

    const key = `${type}:${tmdb_id}`;
    const prev = bestByTmdb.get(key);

    if (!prev || h.score > prev.score) {
      bestByTmdb.set(key, {
        tmdb_id: Number(tmdb_id),
        tipo: String(type || ""),
        score: Number(h.score || 0),
      });
    }
  }

  const arr = Array.from(bestByTmdb.values());
  arr.sort((a, b) => b.score - a.score);

  return arr.slice(0, topK).map((x) => ({
    id_ext: x.tmdb_id,
    tipo: x.tipo,
    score: x.score,
  }));
}

/** -------------------------
 * MySQL queries
 * ------------------------*/
async function fetchBatchToCompute(conn) {
  // ✅ FIX collations: forzamos collation en TODO lo string del JOIN
  const sql = `
    SELECT m.id_ext, m.tipo, m.title, m.popularity
    FROM mfb_index_item m
    LEFT JOIN mfb_related_cache c
      ON (CAST(c.id_ext AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_general_ci)
       = (CAST(m.id_ext AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_general_ci)
     AND (CAST(c.tipo AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_general_ci)
       = (CAST(m.tipo AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_general_ci)
     AND (CAST(c.model AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_general_ci)
       = (CAST(? AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_general_ci)
     AND (CAST(c.algo_version AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_general_ci)
       = (CAST(? AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_general_ci)
     AND c.top_k = ?
    WHERE c.id_ext IS NULL
    ORDER BY m.popularity DESC
    LIMIT ?
  `;
  const [rows] = await conn.execute(sql, [MODEL, ALGO_VERSION, TOP_K, BATCH_SIZE]);
  return rows || [];
}

async function upsertRelatedCache(conn, { id_ext, tipo, related }) {
  const related_json = JSON.stringify(related);

  const sql = `
    INSERT INTO mfb_related_cache
      (id_ext, tipo, related_json, computed_at, model, top_k, algo_version)
    VALUES
      (?, ?, ?, NOW(), ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      related_json = VALUES(related_json),
      computed_at = VALUES(computed_at),
      model = VALUES(model),
      top_k = VALUES(top_k),
      algo_version = VALUES(algo_version)
  `;
  await conn.execute(sql, [id_ext, tipo, related_json, MODEL, TOP_K, ALGO_VERSION]);
}

/** -------------------------
 * Main loop
 * ------------------------*/
async function main() {
  console.log("🚀 related-worker started");
  console.log(`   QDRANT_URL=${QDRANT_URL}`);
  console.log(`   COLLECTION=${QDRANT_COLLECTION}`);
  console.log(`   TOP_K=${TOP_K} BATCH_SIZE=${BATCH_SIZE} SEARCH_LIMIT=${QDRANT_SEARCH_LIMIT}`);
  console.log(`   MYSQL=${MYSQL_USER}@${MYSQL_HOST}:${MYSQL_PORT}/${MYSQL_DB}`);
  console.log(`   ALGO_VERSION=${ALGO_VERSION}`);

  const conn = await mysql.createConnection({
    host: MYSQL_HOST,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database: MYSQL_DB,
    port: MYSQL_PORT,
    charset: "utf8mb4",
  });

  while (true) {
    const batch = await fetchBatchToCompute(conn);

    if (!batch.length) {
      console.log("✅ No quedan títulos por calcular. Sleep 30s…");
      await sleep(30000);
      continue;
    }

    console.log(`📦 Batch: ${batch.length} items`);

    for (const row of batch) {
      const id_ext = Number(row.id_ext);
      const tipo = normalizeTipo(row.tipo);

      try {
        // 1) construir vector promedio de los 10 embeddings del título
        const { vector, meta } = await qdrantBuildTitleVector({ tipo, tmdbId: id_ext });

        if (!vector) {
          console.warn(`⚠️  No vector for ${tipo}:${id_ext} (points=${meta.points}, slots=${meta.slots}) -> cache []`);
          await upsertRelatedCache(conn, { id_ext, tipo, related: [] });
          continue;
        }

        if (meta.slots < Math.min(EXPECTED_SLOTS, 5)) {
          console.warn(`⚠️  Few slots for ${tipo}:${id_ext} (points=${meta.points}, slots=${meta.slots}, dim=${meta.dim})`);
        }

        // 2) búsqueda
        const hits = await qdrantSearchSimilar({ vector, tipo, excludeTmdbId: id_ext });

        // 3) agrupar por tmdb_id para sacar títulos únicos
        const related = buildRelatedFromHits(hits, TOP_K);

        await upsertRelatedCache(conn, { id_ext, tipo, related });

        console.log(`✅ Cached ${related.length} related for ${tipo}:${id_ext}`);
      } catch (e) {
        console.error(`❌ Error on ${tipo}:${id_ext}:`, e?.message || e);
        // Para no dejarlo colgado, cacheamos vacío y seguimos
        try {
          await upsertRelatedCache(conn, { id_ext, tipo, related: [] });
        } catch (_) {}
      }

      await sleep(SLEEP_MS);
    }
  }
}

main().catch((e) => {
  console.error("💥 worker fatal:", e);
  process.exit(1);
});
