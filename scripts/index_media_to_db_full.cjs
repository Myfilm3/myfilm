const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config();

const MEDIA_BASE = "/var/www/_src_myfilm/media";

function listWebps(relFolder) {
  const dir = path.join(MEDIA_BASE, relFolder);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith(".webp")).map(f => ({ relFolder, file: f }));
}

function parseId(file, prefix) {
  if (!file.startsWith(prefix)) return null;
  const n = file.slice(prefix.length).replace(".webp", "");
  const id = parseInt(n, 10);
  return Number.isFinite(id) ? id : null;
}

function setIf(map, tmdb_id, key, val) {
  if (!map.has(tmdb_id)) map.set(tmdb_id, { tmdb_id });
  map.get(tmdb_id)[key] = val;
}

(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    user: process.env.DB_USERNAME || process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_DATABASE || "myfilm",
  });

  // 1) Construimos un mapa tmdb_id -> columnas a actualizar (solo MOVIE por ahora)
  const rowsMap = new Map();

  // Posters
  for (const { relFolder, file } of listWebps("posters/w320")) {
    const id = parseId(file, "movie_"); if (!id) continue;
    setIf(rowsMap, id, "poster_320", `/media/${relFolder}/${file}`);
  }
  for (const { relFolder, file } of listWebps("posters/w500")) {
    const id = parseId(file, "movie_"); if (!id) continue;
    setIf(rowsMap, id, "poster_500", `/media/${relFolder}/${file}`);
  }
  for (const { relFolder, file } of listWebps("posters/original")) {
    const id = parseId(file, "movie_"); if (!id) continue;
    setIf(rowsMap, id, "poster_original", `/media/${relFolder}/${file}`);
  }

  // Backdrops
  for (const { relFolder, file } of listWebps("backdrops/w1280")) {
    const id = parseId(file, "movie_"); if (!id) continue;
    setIf(rowsMap, id, "backdrop_1280", `/media/${relFolder}/${file}`);
  }
  for (const { relFolder, file } of listWebps("backdrops/original")) {
    const id = parseId(file, "movie_"); if (!id) continue;
    setIf(rowsMap, id, "backdrop_original", `/media/${relFolder}/${file}`);
  }

  // Logos
  for (const { relFolder, file } of listWebps("logos/w320")) {
    const id = parseId(file, "movie_"); if (!id) continue;
    setIf(rowsMap, id, "logo_320", `/media/${relFolder}/${file}`);
  }
  for (const { relFolder, file } of listWebps("logos/original")) {
    const id = parseId(file, "movie_"); if (!id) continue;
    setIf(rowsMap, id, "logo_original", `/media/${relFolder}/${file}`);
  }

  const rows = Array.from(rowsMap.values());
  console.log("Detectados tmdb_id únicos (movie):", rows.length);

  if (rows.length === 0) {
    console.log("No hay archivos movie_*.webp en las carpetas esperadas.");
    await db.end();
    process.exit(0);
  }

  // 2) UPSERT en batch (necesita UNIQUE(tmdb_id,type) => ya lo tienes)
  const BATCH = 1000;

  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);

    const cols = [
      "tmdb_id",
      "type",
      "poster_320",
      "poster_500",
      "poster_original",
      "backdrop_1280",
      "backdrop_original",
      "logo_320",
      "logo_original",
      "media_status",
      "media_updated_at",
    ];

    const values = [];
    const placeholders = chunk.map(r => {
      values.push(
        r.tmdb_id,
        "movie",
        r.poster_320 || null,
        r.poster_500 || null,
        r.poster_original || null,
        r.backdrop_1280 || null,
        r.backdrop_original || null,
        r.logo_320 || null,
        r.logo_original || null,
        "done",
        new Date()
      );
      return "(" + cols.map(() => "?").join(",") + ")";
    }).join(",");

    const sql = `
      INSERT INTO peliculas_cache (${cols.join(",")})
      VALUES ${placeholders}
      ON DUPLICATE KEY UPDATE
        poster_320=VALUES(poster_320),
        poster_500=VALUES(poster_500),
        poster_original=VALUES(poster_original),
        backdrop_1280=VALUES(backdrop_1280),
        backdrop_original=VALUES(backdrop_original),
        logo_320=VALUES(logo_320),
        logo_original=VALUES(logo_original),
        media_status=VALUES(media_status),
        media_updated_at=VALUES(media_updated_at);
    `;

    await db.execute(sql, values);
    console.log(`Batch OK: ${i + chunk.length}/${rows.length}`);
  }

  await db.end();
  console.log("✅ Indexación completada (movie)");
})();
