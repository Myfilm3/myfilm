import fs from "fs";
import path from "path";
import sharp from "sharp";

const SEED = "/var/www/_src_myfilm/myfilm/data/titles_seed.json";
const OUT = "/var/www/_src_myfilm/media";

function exists(p){ try{ fs.accessSync(p); return true; } catch{ return false; } }
function safe(s){ return String(s).replace(/[^a-zA-Z0-9_-]/g,"_"); }

async function download(url) {
  const res = await fetch(url, {
    headers: {
      "user-agent": "myfilm-media-worker/1.0",
      "accept": "image/avif,image/webp,image/*,*/*;q=0.8",
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function writeWebp(buf, outPath, width) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  let img = sharp(buf);
  if (width) img = img.resize({ width, withoutEnlargement: true });
  await img.webp({ quality: 82 }).toFile(outPath);
}

function tmdbUrl(size, p) {
  return `https://image.tmdb.org/t/p/${size}${p}`;
}

// Mapa: nuestra carpeta -> size TMDB a descargar + resize final
const POSTER_PIPE = [
  { folder: "w320",  tmdb: "w342",  w: 320 },
  { folder: "w500",  tmdb: "w500",  w: 500 },
  { folder: "original", tmdb: "original", w: null },
];

const BACKDROP_PIPE = [
  { folder: "w320",  tmdb: "w300",   w: 320 },   // pillamos w300 y subimos un pelín
  { folder: "w500",  tmdb: "w780",   w: 500 },   // pillamos w780 y bajamos
  { folder: "w1280", tmdb: "w1280",  w: 1280 },
  { folder: "original", tmdb: "original", w: null },
];

async function processOne(t, idx, total) {
  const type = t.type === "tv" ? "tv" : "movie";
  const id = t.tmdb_id;
  const base = safe(`${type}_${id}`);

  // POSTER
  if (t.poster_path) {
    for (const step of POSTER_PIPE) {
      const outWebp = path.join(OUT, "posters", step.folder, `${base}.webp`);
      if (exists(outWebp)) continue;
      const buf = await download(tmdbUrl(step.tmdb, t.poster_path));
      await writeWebp(buf, outWebp, step.w);
    }
  }

  // BACKDROP
  if (t.backdrop_path) {
    for (const step of BACKDROP_PIPE) {
      const outWebp = path.join(OUT, "backdrops", step.folder, `${base}.webp`);
      if (exists(outWebp)) continue;
      const buf = await download(tmdbUrl(step.tmdb, t.backdrop_path));
      await writeWebp(buf, outWebp, step.w);
    }
  }

  if ((idx+1) % 50 === 0) console.log(`✅ ${idx+1}/${total}`);
}

async function run() {
  const titles = JSON.parse(fs.readFileSync(SEED, "utf8"));
  console.log(`🚀 Seed: ${titles.length} títulos`);

  const CONCURRENCY = parseInt(process.env.MEDIA_CONCURRENCY || "6", 10);
  let i = 0;

  async function worker() {
    while (true) {
      const idx = i++;
      if (idx >= titles.length) return;
      const t = titles[idx];
      try {
        await processOne(t, idx, titles.length);
      } catch (e) {
        console.log(`❌ ${idx+1}/${titles.length} ${t.type}_${t.tmdb_id} -> ${e.message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log("🏁 DONE");
}

run().catch(e => { console.error(e); process.exit(1); });
