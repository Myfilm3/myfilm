/**
 * related_worker_v3_api_cache.js
 * Cachea en MariaDB las relacionadas usando EXACTAMENTE la misma lógica que la web:
 * llama a tu endpoint /api/mfb/recommendations/by-title y persiste ids en mfb_related_cache.
 *
 * Requisitos env (.env.related recomendado):
 *   MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE
 *   API_BASE (ej: http://127.0.0.1:3001/api)
 *   TOP_K (default 22)
 *   BATCH_SIZE (default 50)
 *   SLEEP_MS (default 0)
 *   MODEL (default voyage-3-large)
 *   ALGO_VERSION (default v2)
 */

const mysql = require("mysql2/promise");

const API_BASE = process.env.API_BASE || "http://127.0.0.1:3001/api";
const TOP_K = Number(process.env.TOP_K || 22);
const BATCH_SIZE = Number(process.env.BATCH_SIZE || 50);
const SLEEP_MS = Number(process.env.SLEEP_MS || 0);
const MODEL = process.env.MODEL || "voyage-3-large";
const ALGO_VERSION = process.env.ALGO_VERSION || "v2";

const MYSQL_HOST = process.env.MYSQL_HOST || "127.0.0.1";
const MYSQL_USER = process.env.MYSQL_USER || "root";
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || "";
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || "myfilm";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function nowIso() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

async function fetchJson(url) {
  const r = await fetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
  return r.json();
}

async function getBatch(conn) {
  const sql = `
    SELECT m.id_ext, m.tipo
    FROM mfb_index_item m
    LEFT JOIN mfb_related_cache c
      ON c.id_ext = m.id_ext
     AND c.tipo = m.tipo
     AND c.model = ?
     AND c.algo_version = ?
     AND c.top_k = ?
    WHERE c.id_ext IS NULL
    ORDER BY m.popularity DESC
    LIMIT ?
  `;
  const [rows] = await conn.execute(sql, [MODEL, ALGO_VERSION, TOP_K, BATCH_SIZE]);
  return rows || [];
}

async function upsertCache(conn, { id_ext, tipo, relatedIds }) {
  const relatedJson = JSON.stringify(relatedIds || []);
  const sql = `
    INSERT INTO mfb_related_cache (id_ext, tipo, model, algo_version, top_k, related_json, computed_at)
    VALUES (?, ?, ?, ?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE
      related_json = VALUES(related_json),
      computed_at  = VALUES(computed_at)
  `;
  await conn.execute(sql, [id_ext, tipo, MODEL, ALGO_VERSION, TOP_K, relatedJson]);
}

async function computeOne(conn, { id_ext, tipo }) {
  const url = `${API_BASE}/mfb/recommendations/by-title?titleId=${encodeURIComponent(id_ext)}&limit=${TOP_K}`;

  const data = await fetchJson(url);

  const results = Array.isArray(data?.results) ? data.results : [];
  const relatedIds = results
    .map((x) => Number(x.tmdb_id))
    .filter((n) => Number.isFinite(n) && n > 0);

  await upsertCache(conn, { id_ext, tipo, relatedIds });
  return { count: relatedIds.length };
}

async function main() {
  const conn = await mysql.createConnection({
    host: MYSQL_HOST,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database: MYSQL_DATABASE,
    charset: "utf8mb4",
  });

  let loop = 0;
  let ok = 0, empty = 0, err = 0;

  console.log(`${nowIso()}: 🚀 related_worker_v3_api_cache start`);
  console.log(`${nowIso()}: API_BASE=${API_BASE} TOP_K=${TOP_K} BATCH_SIZE=${BATCH_SIZE} MODEL=${MODEL} ALGO=${ALGO_VERSION}`);

  while (true) {
    loop++;
    const batch = await getBatch(conn);

    if (!batch.length) {
      console.log(`${nowIso()}: ✅ Done. No more items to compute. ok=${ok} empty=${empty} err=${err}`);
      break;
    }

    console.log(`${nowIso()}: 📦 Batch: ${batch.length} items`);

    for (const item of batch) {
      try {
        const r = await computeOne(conn, item);
        if (r.count > 0) {
          ok++;
          console.log(`${nowIso()}: ✅ Cached ${r.count} related for ${item.tipo}:${item.id_ext}`);
        } else {
          empty++;
          console.log(`${nowIso()}: ⚠️ EMPTY related for ${item.tipo}:${item.id_ext}`);
        }
      } catch (e) {
        err++;
        console.log(`${nowIso()}: ❌ Error on ${item.tipo}:${item.id_ext}: ${e?.message || e}`);
      }

      if (SLEEP_MS > 0) await sleep(SLEEP_MS);
    }

    console.log(`${nowIso()}: 🔁 Loop ${loop} done. ok=${ok} empty=${empty} err=${err}`);
  }

  await conn.end();
}

main().catch((e) => {
  console.error(`${nowIso()}: FATAL:`, e);
  process.exit(1);
});
