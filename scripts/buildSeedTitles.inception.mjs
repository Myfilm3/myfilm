// scripts/buildSeedTitles.inception.mjs
import fs from "fs";
import path from "path";
import "dotenv/config";

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = "https://api.themoviedb.org/3";

// Inception / Origen (TMDB movie id)
const TMDB_ID = 27205;

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB error ${res.status}: ${await res.text()}`);
  return res.json();
}

function yearFromDate(dateStr) {
  if (!dateStr) return null;
  const y = Number(dateStr.slice(0, 4));
  return Number.isFinite(y) ? y : null;
}

async function main() {
  if (!TMDB_API_KEY) throw new Error("Missing TMDB_API_KEY in .env");

  // 1) Movie details (incluye overview y genres completos)
  const detailsUrl = `${TMDB_BASE}/movie/${TMDB_ID}?api_key=${TMDB_API_KEY}&language=es-ES`;
  const movie = await fetchJson(detailsUrl);

  // 2) Credits (director + cast top)
  const creditsUrl = `${TMDB_BASE}/movie/${TMDB_ID}/credits?api_key=${TMDB_API_KEY}&language=es-ES`;
  const credits = await fetchJson(creditsUrl);

  const director =
    (credits.crew || []).find((c) => c.job === "Director")?.name || null;

  const topCast = (credits.cast || [])
    .slice(0, 8)
    .map((c) => c.name)
    .filter(Boolean);

  const normalized = {
    title_id: movie.id,
    tmdb_id: movie.id,
    type: "movie",
    title: movie.title || "",
    original_title: movie.original_title || "",
    year: yearFromDate(movie.release_date),
    language: movie.original_language || null,
    genres: (movie.genres || []).map((g) => g.id),
    genres_names: (movie.genres || []).map((g) => g.name),
    vote_average: movie.vote_average ?? 0,
    vote_count: movie.vote_count ?? 0,
    popularity: movie.popularity ?? 0,
    runtime: movie.runtime ?? null,
    poster_path: movie.poster_path || null,
    backdrop_path: movie.backdrop_path || null,
    overview: movie.overview || "",
    tagline: movie.tagline || "",
    director,
    cast_top: topCast,
    source_bucket: "single_test_inception",
  };

  const outDir = path.join(process.cwd(), "data");
  const outPath = path.join(outDir, "titles_seed_inception.json");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(outPath, JSON.stringify([normalized], null, 2), "utf8");
  console.log(`✅ Guardado 1 título (Inception) en: ${outPath}`);
}

main().catch((err) => {
  console.error("❌ ERROR en buildSeedTitles.inception.mjs:");
  console.error(err);
  process.exit(1);
});