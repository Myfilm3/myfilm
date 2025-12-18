// scripts/buildSeedTitles.mjs
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const TMDB_API_KEY = process.env.TMDB_API_KEY || '5769004c3a27bb3c2ab56cd925a68d85';
const TMDB_BASE = 'https://api.themoviedb.org/3';

// TMDB SOLO PERMITE PAGE 1–500
const MAX_TMDB_PAGE = 500;
const COUNT_PER_BUCKET = 5000;

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function fetchGenreMap() {
  const url = `${TMDB_BASE}/genre/movie/list?api_key=${TMDB_API_KEY}&language=es-ES`;
  const data = await fetchJson(url);
  const map = new Map();
  for (const g of data.genres || []) map.set(g.id, g.name);
  return map;
}

function normalizeMovie(movie, sourceTag, genreMap) {
  const date = movie.release_date || movie.first_air_date || '';
  const year = date ? Number(date.slice(0, 4)) : null;

  const genre_ids = movie.genre_ids || [];
  const genres_names = genre_ids.map((id) => genreMap.get(id)).filter(Boolean);

  return {
    title_id: movie.id,
    tmdb_id: movie.id,
    type: 'movie',
    title: movie.title || movie.name || '',
    original_title: movie.original_title || movie.original_name || '',
    year,
    genres: genre_ids,
    genres_names,                 // ✅ nombres
    overview: movie.overview || '', // ✅ sinopsis (ya viene en listados)
    vote_average: movie.vote_average ?? 0,
    vote_count: movie.vote_count ?? 0,
    popularity: movie.popularity ?? 0,
    language: movie.original_language || null,
    is_kid_friendly: false,
    poster_path: movie.poster_path,
    backdrop_path: movie.backdrop_path,
    source_bucket: sourceTag,
  };
}

async function collectMovies(urlBuilder, maxCount, label) {
  const map = new Map();
  let page = 1;

  while (map.size < maxCount && page <= MAX_TMDB_PAGE) {
    const url = urlBuilder(page);
    console.log(`Fetching ${label} page ${page}...`);
    const data = await fetchJson(url);

    for (const m of data.results || []) {
      if (!map.has(m.id)) {
        map.set(m.id, m);
        if (map.size >= maxCount) break;
      }
    }

    if (!data.results || data.results.length === 0 || page >= data.total_pages || page >= MAX_TMDB_PAGE) break;
    page++;
  }

  console.log(`${label}: ${map.size} pelis recogidas.`);
  return Array.from(map.values());
}

async function main() {
  const genreMap = await fetchGenreMap(); // ✅ 1 sola llamada

  const topRated = await collectMovies(
    (page) => `${TMDB_BASE}/movie/top_rated?api_key=${TMDB_API_KEY}&language=es-ES&page=${page}`,
    COUNT_PER_BUCKET,
    'top_rated'
  );

  const trending = await collectMovies(
    (page) => `${TMDB_BASE}/trending/movie/week?api_key=${TMDB_API_KEY}&language=es-ES&page=${page}`,
    COUNT_PER_BUCKET,
    'trending'
  );

  const popular = await collectMovies(
    (page) => `${TMDB_BASE}/movie/popular?api_key=${TMDB_API_KEY}&language=es-ES&page=${page}`,
    COUNT_PER_BUCKET,
    'popular'
  );

  const allMap = new Map();
  for (const [bucket, arr] of [
    ['top_rated', topRated],
    ['trending', trending],
    ['popular', popular],
  ]) {
    for (const m of arr) {
      if (!allMap.has(m.id)) {
        allMap.set(m.id, normalizeMovie(m, bucket, genreMap));
      }
    }
  }

  const normalized = Array.from(allMap.values());
  console.log(`Total tras deduplicar: ${normalized.length}`);

  const outDir = path.join(process.cwd(), 'data');
  const outPath = path.join(outDir, 'titles_seed.json');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(outPath, JSON.stringify(normalized, null, 2), 'utf8');
  console.log(`Guardado ${normalized.length} títulos en ${outPath}`);
}

main().catch((err) => {
  console.error('❌ ERROR en buildSeedTitles.mjs:');
  console.error(err);
  process.exit(1);
});