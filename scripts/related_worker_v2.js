// scripts/related_worker_v2.js
// MYFILM - Related Cache Worker (v2)
// Strategy: build a "composite profile vector" per title from up to 10 slot vectors in Qdrant,
// then run a single vector search to get TOP_K related titles and cache into MariaDB.
//
// Requires env (.env.related) like:
//   QDRANT_URL=...
//   QDRANT_API_KEY=...
//   QDRANT_COLLECTION=title_profiles_v2
//   MYSQL_HOST=127.0.0.1
//   MYSQL_PORT=3306
//   MYSQL_USER=myfilm_worker
//   MYSQL_PASS=...
//   MYSQL_DB=myfilm
// Optional:
//   TOP_K=22
//   BATCH_SIZE=50
//   ALGO_VERSION=v2
//   MODEL=voyage-3-large
//   SLOTS=10
//   SLEEP_MS=0
//   LOG_EVERY=1
//
// Notes:
// - Qdrant point IDs are numeric/UUID; we DO NOT use movie:123 style IDs.
// - We query by payload (tmdb_id + type) using scroll.
// - We cache per (id_ext, tipo, model, algo_version, top_k).
// - Empty related_json is stored ONLY when no vectors exist at all for that title.

import 'dotenv/config';
import mysql from 'mysql2/promise';

// -------------------- ENV --------------------
const QDRANT_URL = process.env.QDRANT_URL?.replace(/\/+$/, '');
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || '';
const COLLECTION = process.env.QDRANT_COLLECTION || 'title_profiles_v2';

const MYSQL_HOST = process.env.MYSQL_HOST || '127.0.0.1';
const MYSQL_PORT = Number(process.env.MYSQL_PORT || 3306);
const MYSQL_USER = process.env.MYSQL_USER || 'root';
const MYSQL_PASS = process.env.MYSQL_PASS || '';
const MYSQL_DB = process.env.MYSQL_DB || 'myfilm';

const TOP_K = Number(process.env.TOP_K || 22);
const BATCH_SIZE = Number(process.env.BATCH_SIZE || 50);
const SLOTS = Number(process.env.SLOTS || 10);

const MODEL = process.env.MODEL || 'voyage-3-large';
const ALGO_VERSION = process.env.ALGO_VERSION || 'v2';

const SLEEP_MS = Number(process.env.SLEEP_MS || 0);
const LOG_EVERY = Number(process.env.LOG_EVERY || 1);

if (!QDRANT_URL) {
  console.error('❌ Missing QDRANT_URL');
  process.exit(1);
}

// -------------------- HELPERS --------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function clampInt(n, min, max) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.min(max, Math.max(min, Math.floor(x)));
}

function safeJsonParse(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

/**
 * Compose vector from multiple slot vectors.
 * v1: simple average of all available slot vectors.
 * (We can add weights later.)
 */
function averageVectors(vectors) {
  if (!vectors.length) return null;
  const dim = vectors[0].length;
  const out = new Array(dim).fill(0);

  for (const v of vectors) {
    if (!v || v.length !== dim) continue;
    for (let i = 0; i < dim; i++) out[i] += v[i];
  }
  const denom = vectors.length;
  for (let i = 0; i < dim; i++) out[i] /= denom;
  return out;
}

// -------------------- QDRANT CLIENT --------------------
async function qdrantFetch(path, body) {
  const res = await fetch(`${QDRANT_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(QDRANT_API_KEY ? { 'api-key': QDRANT_API_KEY } : {}),
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  const json = safeJsonParse(text, null);

  if (!res.ok) {
    const msg = json ? JSON.stringify(json) : text;
    throw new Error(`Qdrant ${path} failed ${res.status}: ${msg}`);
  }
  return json;
}

/**
 * Scroll all points for a title by payload filter: tmdb_id + type
 * Returns array of { payload, vector }
 */
async function qdrantScrollTitleVectors({ tmdb_id, tipo }) {
  // Qdrant scroll is paginated by "offset"
  let offset = null;
  const points = [];

  // Important: we request vectors=true to get embeddings back.
  // To keep it simple, we fetch default vector.
  while (true) {
    const body = {
      limit: 128, // enough for 10 slots; still safe
      with_payload: true,
      with_vector: true,
      filter: {
        must: [
          { key: 'tmdb_id', match: { value: Number(tmdb_id) } },
          { key: 'type', match: { value: String(tipo) } },
        ],
      },
      ...(offset ? { offset } : {}),
    };

    const data = await qdrantFetch(`/collections/${COLLECTION}/points/scroll`, body);

    const batch = (data?.result?.points || []).map((p) => {
      const vec =
        p?.vector?.default ??
        p?.vector ??
        null; // depends on qdrant config; default is typical when single vector named "default"
      return { payload: p?.payload || {}, vector: vec };
    });

    points.push(...batch);

    const nextOffset = data?.result?.next_page_offset ?? null;
    if (!nextOffset) break;
    offset = nextOffset;
  }

  // Keep only points that have a vector array
  return points.filter((p) => Array.isArray(p.vector) && p.vector.length > 0);
}

/**
 * Search related titles using a composite vector, filtered by same type.
 * Returns array of tmdb_id numbers.
 */
async function qdrantSearchRelated({ tipo, vector, tmdb_id }) {
  const body = {
    vector,
    limit: TOP_K,
    with_payload: true,
    with_vector: false,
    filter: {
      must: [{ key: 'type', match: { value: String(tipo) } }],
      must_not: [{ key: 'tmdb_id', match: { value: Number(tmdb_id) } }],
    },
  };

  const data = await qdrantFetch(`/collections/${COLLECTION}/points/search`, body);

  const hits = data?.result || [];
  // We want unique tmdb_id results (since Q драм: may return multiple slots per same title)
  const seen = new Set();
  const out = [];

  for (const h of hits) {
    const pid = h?.payload?.tmdb_id;
    if (pid == null) continue;
    const idNum = Number(pid);
    if (!Number.isFinite(idNum)) continue;
    if (seen.has(idNum)) continue;
    seen.add(idNum);
    out.push(idNum);
    if (out.length >= TOP_K) break;
  }

  return out;
}

// -------------------- MYSQL --------------------
async function mysqlConnect() {
  const conn = await mysql.createConnection({
    host: MYSQL_HOST,
    port: MYSQL_PORT,
    user: MYSQL_USER,
    password: MYSQL_PASS,
    database: MYSQL_DB,
    // safer for utf8 issues
    charset: 'utf8mb4',
  });
  return conn;
}

/**
 * Ensure cache table exists (safe).
 * Adjust collation to match your DB if needed.
 */
async function ensureTables(conn) {
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS mfb_related_cache (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      id_ext INT NOT NULL,
      tipo VARCHAR(16) NOT NULL,
      model VARCHAR(64) NOT NULL,
      algo_version VARCHAR(32) NOT NULL,
      top_k INT NOT NULL,
      related_json JSON NOT NULL,
      computed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_related (id_ext, tipo, model, algo_version, top_k),
      KEY idx_tipo (tipo),
      KEY idx_id_ext (id_ext),
      KEY idx_computed_at (computed_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  // Index items table is expected to exist:
  // mfb_index_item: (id_ext, tipo, title, popularity, ...)
}

/**
 * Fetch next batch of titles without cache for current config.
 * We avoid collation errors by forcing same collation in join comparisons.
 */
async function fetchBatchToCompute(conn) {
  const sql = `
    SELECT m.id_ext, m.tipo, m.title, m.popularity
    FROM mfb_index_item m
    LEFT JOIN mfb_related_cache c
      ON c.id_ext = m.id_ext
     AND (c.tipo COLLATE utf8mb4_general_ci) = (m.tipo COLLATE utf8mb4_general_ci)
     AND (c.model COLLATE utf8mb4_general_ci) = (CAST(? AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_general_ci)
     AND (c.algo_version COLLATE utf8mb4_general_ci) = (CAST(? AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_general_ci)
     AND c.top_k = ?
    WHERE c.id_ext IS NULL
    ORDER BY m.popularity DESC
    LIMIT ?
  `;

  const [rows] = await conn.execute(sql, [MODEL, ALGO_VERSION, TOP_K, BATCH_SIZE]);
  return rows || [];
}

/**
 * Upsert cache row.
 */
async function upsertCache(conn, { id_ext, tipo, relatedIds }) {
  const relatedJson = JSON.stringify(relatedIds || []);
  const sql = `
    INSERT INTO mfb_related_cache (id_ext, tipo, model, algo_version, top_k, related_json, computed_at)
    VALUES (?, ?, ?, ?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE
      related_json = VALUES(related_json),
      computed_at = VALUES(computed_at)
  `;
  await conn.execute(sql, [id_ext, tipo, MODEL, ALGO_VERSION, TOP_K, relatedJson]);
}

// -------------------- MAIN LOOP --------------------
async function computeOne(conn, item) {
  const { id_ext, tipo } = item;

  // 1) Pull all slot vectors for this title by payload
  const points = await qdrantScrollTitleVectors({ tmdb_id: id_ext, tipo });

  if (!points.length) {
    // No vectors at all => store empty (so we don't retry forever)
    await upsertCache(conn, { id_ext, tipo, relatedIds: [] });
    return { ok: true, empty: true, slots: 0, related: 0 };
  }

  // 2) Deduplicate by slot, keep one vector per slot (0..SLOTS-1).
  // If duplicates exist, first wins.
  const bySlot = new Map();
  for (const p of points) {
    const slot = clampInt(p?.payload?.slot, 0, 999);
    if (slot < 0 || slot >= SLOTS) continue;
    if (!bySlot.has(slot)) bySlot.set(slot, p.vector);
  }

  const vectors = Array.from(bySlot.values());
  const composite = averageVectors(vectors);

  if (!composite) {
    await upsertCache(conn, { id_ext, tipo, relatedIds: [] });
    return { ok: true, empty: true, slots: 0, related: 0 };
  }

  // 3) Search related and unique by tmdb_id
  const relatedIds = await qdrantSearchRelated({ tipo, vector: composite, tmdb_id: id_ext });

  // 4) Cache
  await upsertCache(conn, { id_ext, tipo, relatedIds });

  return { ok: true, empty: relatedIds.length === 0, slots: vectors.length, related: relatedIds.length };
}

async function main() {
  console.log('🚀 related-worker v2 started');
  console.log(`   QDRANT_URL=${QDRANT_URL}`);
  console.log(`   COLLECTION=${COLLECTION} TOP_K=${TOP_K} BATCH_SIZE=${BATCH_SIZE} SLOTS=${SLOTS}`);
  console.log(`   MYSQL=${MYSQL_USER}@${MYSQL_HOST}:${MYSQL_PORT}/${MYSQL_DB}`);
  console.log(`   MODEL=${MODEL} ALGO_VERSION=${ALGO_VERSION}`);

  const conn = await mysqlConnect();
  await ensureTables(conn);

  let loop = 0;

  while (true) {
    const batch = await fetchBatchToCompute(conn);
    if (!batch.length) {
      console.log('✅ Nothing to compute. Exiting.');
      break;
    }

    console.log(`📦 Batch: ${batch.length} items`);

    let okCount = 0;
    let emptyCount = 0;
    let errCount = 0;

    for (let i = 0; i < batch.length; i++) {
      const item = batch[i];
      try {
        const r = await computeOne(conn, item);
        okCount++;

        if (r.empty) emptyCount++;

        if (LOG_EVERY <= 1 || (i + 1) % LOG_EVERY === 0) {
          if (r.empty) {
            console.log(`⚠️  No vectors/related for ${item.tipo}:${item.id_ext} (slots=${r.slots}) -> cache []`);
          } else {
            console.log(`✅ Cached ${r.related} related for ${item.tipo}:${item.id_ext} (slots_used=${r.slots})`);
          }
        }
      } catch (e) {
        errCount++;
        console.error(`❌ Error on ${item.tipo}:${item.id_ext}: ${e?.message || e}`);
        // IMPORTANT: we do NOT cache empty on errors; we want retries after fixes.
      }

      if (SLEEP_MS > 0) await sleep(SLEEP_MS);
    }

    loop++;
    console.log(`🔁 Loop ${loop} done. ok=${okCount} empty=${emptyCount} err=${errCount}`);
  }

  await conn.end();
}

process.on('unhandledRejection', (err) => {
  console.error('💥 worker fatal (unhandledRejection):', err);
  process.exit(1);
});
process.on('uncaughtException', (err) => {
  console.error('💥 worker fatal (uncaughtException):', err);
  process.exit(1);
});

main().catch((e) => {
  console.error('💥 worker fatal:', e);
  process.exit(1);
});
