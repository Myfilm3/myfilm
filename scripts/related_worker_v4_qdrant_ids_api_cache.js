import fs from "fs";
import mysql from "mysql2/promise";

function now() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

const MYSQL_HOST = process.env.MYSQL_HOST || "127.0.0.1";
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || "myfilm";
const MYSQL_USER = process.env.MYSQL_USER || "myfilm_worker";
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || "";

const API_BASE = (process.env.API_BASE || "http://127.0.0.1:3001/api").replace(/\/+$/, "");
const TOP_K = Number(process.env.TOP_K || 22);
const SLEEP_MS = Number(process.env.SLEEP_MS || 120); // <- clave para NO 429
const MODEL = process.env.MODEL || "voyage-3-large";
const ALGO_VERSION = process.env.ALGO_VERSION || "v2";
const IDS_FILE = process.env.IDS_FILE || "tmp/qdrant_title_ids.txt";

const MAX_RETRIES = Number(process.env.MAX_RETRIES || 6);
const FETCH_TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS || 180000);

let __currentTitle = null;
let __currentStart = 0;

setInterval(() => {
  if (__currentTitle != null) {
    const secs = Math.round((Date.now() - __currentStart) / 1000);
    console.log(now() + ": 💓 esperando API titleId=" + __currentTitle + " (" + secs + "s)");
  }
}, 10000);

async function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function apiGetRelated(titleId) {
  const url = `${API_BASE}/mfb/recommendations/by-title?titleId=${titleId}&limit=${TOP_K}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          // si quieres forzar user dev, descomenta:
          // "x-dev-user-id": "2",
        },
      });

      if (res.status === 429) {
        const wait = Math.min(5000, 250 * Math.pow(2, attempt));
        console.log(`${now()}: ⏳ 429 on ${titleId}. retry in ${wait}ms`);
        await sleep(wait);
        continue;
      }

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${txt.slice(0, 180)}`);
      }

      const data = await res.json();
      const results = Array.isArray(data?.results) ? data.results : [];
      const ids = results.map((x) => Number(x?.tmdb_id ?? 0)).filter((n) => Number.isFinite(n) && n > 0);

      __currentTitle = null;
      return ids.slice(0, TOP_K);
    } catch (e) {
      __currentTitle = null; // cleanup on error
      const wait = Math.min(5000, 250 * Math.pow(2, attempt));
      if (attempt >= MAX_RETRIES) throw e;
      console.log(`${now()}: ⚠️ fetch fail on ${titleId}: ${String(e).slice(0, 140)} -> retry ${wait}ms`);
      await sleep(wait);
    }
  }

  return [];
}

async function ensureTable(conn) {
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS mfb_related_cache (
      id_ext BIGINT NOT NULL,
      tipo VARCHAR(16) NOT NULL,
      model VARCHAR(64) NOT NULL,
      algo_version VARCHAR(32) NOT NULL,
      top_k INT NOT NULL,
      related_json LONGTEXT NOT NULL,
      computed_at DATETIME NOT NULL,
      PRIMARY KEY (id_ext, tipo, model, algo_version, top_k),
      KEY idx_computed_at (computed_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

async function upsertCache(conn, { id_ext, tipo, relatedIds }) {
  const relatedJson = JSON.stringify(relatedIds || []);
  await conn.execute(
    `
    INSERT INTO mfb_related_cache (id_ext, tipo, model, algo_version, top_k, related_json, computed_at)
    VALUES (?, ?, ?, ?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE
      related_json = VALUES(related_json),
      computed_at = VALUES(computed_at)
    `,
    [id_ext, tipo, MODEL, ALGO_VERSION, TOP_K, relatedJson]
  );
}

async function main() {
  console.log(`${now()}: 🚀 related_worker_v4 start`);
  console.log(`${now()}: IDS_FILE=${IDS_FILE}`);
  console.log(`${now()}: API_BASE=${API_BASE} TOP_K=${TOP_K} SLEEP_MS=${SLEEP_MS} MODEL=${MODEL} ALGO=${ALGO_VERSION}`);
  console.log(`${now()}: DB=${MYSQL_USER}@${MYSQL_HOST}/${MYSQL_DATABASE}`);

  if (!fs.existsSync(IDS_FILE)) {
    throw new Error(`IDs file not found: ${IDS_FILE}. Run dump_qdrant_title_ids.js first.`);
  }

  const ids = fs
    .readFileSync(IDS_FILE, "utf8")
    .split("\n")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);

  console.log(`${now()}: loaded ${ids.length} title_ids from Qdrant`);

  const conn = await mysql.createConnection({
    host: MYSQL_HOST,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database: MYSQL_DATABASE,
    charset: "utf8mb4",
  });

  await ensureTable(conn);

  let ok = 0, empty = 0, err = 0;

  for (let i = 0; i < ids.length; i++) {
    const titleId = ids[i];

    try {
      const related = await apiGetRelated(titleId);

      // Si tu API siempre trabaja con "movie", deja fijo.
      // Si en futuro quieres series también, entonces el dump debe incluir "tipo".
      const tipo = "movie";

      await upsertCache(conn, { id_ext: titleId, tipo, relatedIds: related });

      if (related.length) {
        ok++;
        console.log(`${now()}: ✅ ${titleId} -> cached ${related.length}`);
      } else {
        empty++;
        console.log(`${now()}: ⚠️ EMPTY ${titleId}`);
      }
    } catch (e) {
      err++;
      console.log(`${now()}: ❌ ${titleId} ERROR: ${String(e).slice(0, 220)}`);
    }

    // rate-limit básico
    if (SLEEP_MS > 0) await sleep(SLEEP_MS);

    if ((i + 1) % 200 === 0) {
      console.log(`${now()}: ---- progress ${i + 1}/${ids.length} ok=${ok} empty=${empty} err=${err}`);
    }
  }

  console.log(`${now()}: 🎉 DONE ok=${ok} empty=${empty} err=${err}`);
  await conn.end();
}

main().catch((e) => {
  console.error(`${now()}: 💥 FATAL`, e);
  process.exit(1);
});
