import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const MEDIA_BASE = "/var/www/_src_myfilm/media";

const db = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  user: "root",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE || "myfilm"
});

async function upsert(tmdb_id, type, field, value) {
  await db.execute(
    `
    INSERT INTO peliculas_cache (tmdb_id, type, media_status)
    VALUES (?, ?, 'processing')
    ON DUPLICATE KEY UPDATE
      ${field} = VALUES(${field}),
      media_status = 'processing'
    `,
    [tmdb_id, type]
  );
}

function scan(type, folder, prefix, field) {
  const dir = path.join(MEDIA_BASE, folder);
  if (!fs.existsSync(dir)) return;

  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".webp")) continue;
    const tmdb_id = parseInt(f.replace(prefix, "").replace(".webp", ""));
    upsert(tmdb_id, type, field, `/media/${folder}/${f}`);
  }
}

// POSTERS
scan("movie", "posters/w320", "movie_", "poster_320");
scan("movie", "posters/w500", "movie_", "poster_500");
scan("movie", "posters/original", "movie_", "poster_original");

// BACKDROPS
scan("movie", "backdrops/w1280", "movie_", "backdrop_1280");
scan("movie", "backdrops/original", "movie_", "backdrop_original");

// LOGOS
scan("movie", "logos/w320", "movie_", "logo_320");
scan("movie", "logos/original", "movie_", "logo_original");

await db.end();
console.log("✅ Media indexada correctamente");
