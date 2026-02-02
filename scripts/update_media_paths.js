import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const MEDIA_BASE = "/var/www/_src_myfilm/media";

const db = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

async function processFolder(type, column, folder, prefix) {
  const dir = path.join(MEDIA_BASE, folder);
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir).filter(f => f.endsWith(".webp"));

  for (const file of files) {
    const tmdb_id = parseInt(file.replace(prefix, "").replace(".webp", ""));
    if (!tmdb_id) continue;

    const value = `/media/${folder}/${file}`;

    await db.execute(
      `
      UPDATE peliculas_cache
      SET ${column} = ?,
          media_status = 'done',
          media_updated_at = NOW()
      WHERE tmdb_id = ? AND type = ?
      `,
      [value, tmdb_id, type]
    );
  }
}

// ───── MOVIES ─────

// Posters
await processFolder("movie", "poster_320", "posters/w320", "movie_");
await processFolder("movie", "poster_500", "posters/w500", "movie_");
await processFolder("movie", "poster_original", "posters/original", "movie_");

// Backdrops
await processFolder("movie", "backdrop_320", "backdrops/w320", "movie_").catch(()=>{});
await processFolder("movie", "backdrop_500", "backdrops/w500", "movie_").catch(()=>{});
await processFolder("movie", "backdrop_1280", "backdrops/w1280", "movie_");
await processFolder("movie", "backdrop_original", "backdrops/original", "movie_");

// Logos
await processFolder("movie", "logo_320", "logos/w320", "movie_");
await processFolder("movie", "logo_original", "logos/original", "movie_");

await db.end();
console.log("✅ Media actualizada correctamente");
