// scripts/embedTitleProfilesToQdrant.v2.mjs
import fs from "fs";
import path from "path";
import "dotenv/config";

const VOYAGE_KEY = process.env.VOYAGE_API_KEY;
const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;

const COLLECTION_NAME = "title_profiles_v2";

// OJO: 10 perfiles fijos
const PROFILE_DEFS = [
  ["theme", "Describe de forma breve y clara el TEMA CENTRAL (de qué va realmente)."],
  ["mood", "Describe el MOOD / sensación emocional global (tenso, melancólico, épico, inquietante, etc.)."],
  ["pace", "Describe el RITMO / pacing (lento/medio/rápido/frenético) y cómo se percibe al verla."],
  ["tone", "Describe el TONO (serio, oscuro, esperanzador, irónico, etc.)."],
  ["visual", "Describe el ESTILO VISUAL / fotografía (realista, onírico, estilizado, oscuro, limpio...)."],
  ["depth", "Describe el NIVEL DE PROFUNDIDAD / complejidad (simple vs cerebral/filosófica)."],
  ["tension", "Describe el NIVEL DE TENSIÓN / suspense a lo largo de la película."],
  ["emotion", "Describe las EMOCIONES principales que despierta (asombro, angustia, fascinación...)."],
  ["target", "Describe el PÚBLICO principal (gran público, cinéfilos, fans sci-fi, etc.)."],
  ["experience", "Describe el TIPO DE EXPERIENCIA: blockbuster, thriller cerebral, autor, feel-good, etc."],
];

// Batch de títulos (cada título genera 10 inputs)
// 16 => 160 inputs por request (seguro)
const TITLE_BATCH_SIZE = 16;

function buildMetaText(t) {
  const genres = (t.genres_names || []).join(", ");
  const parts = [
    `Título: ${t.title}`,
    `Título original: ${t.original_title}`,
    t.year ? `Año: ${t.year}` : null,
    t.language ? `Idioma original: ${t.language}` : null,
    genres ? `Géneros: ${genres}` : null,
    t.vote_average ? `Nota media: ${t.vote_average}` : null,
    t.vote_count ? `Votos: ${t.vote_count}` : null,
    t.popularity ? `Popularidad: ${t.popularity}` : null,
    t.overview ? `Sinopsis: ${t.overview}` : null,
  ].filter(Boolean);

  return parts.join("\n");
}

async function createEmbeddings(inputs) {
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${VOYAGE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "voyage-3",
      input: inputs,
    }),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Voyage error ${res.status}: ${msg}`);
  }

  const data = await res.json();
  return data.data.map((e) => e.embedding);
}

async function upsertToQdrant(points) {
  const url = `${QDRANT_URL}/collections/${COLLECTION_NAME}/points`;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "api-key": QDRANT_API_KEY,
    },
    body: JSON.stringify({ points }),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Qdrant error ${res.status}: ${msg}`);
  }

  return res.json();
}

async function main() {
  if (!VOYAGE_KEY) throw new Error("Missing VOYAGE_API_KEY in .env");
  if (!QDRANT_URL) throw new Error("Missing QDRANT_URL in .env");
  if (!QDRANT_API_KEY) throw new Error("Missing QDRANT_API_KEY in .env");

  const filePath = path.join(process.cwd(), "data", "titles_seed.json");
  const titles = JSON.parse(fs.readFileSync(filePath, "utf8"));
  console.log(`📚 Títulos a procesar: ${titles.length} (x10 perfiles => ${titles.length * 10} vectores)`);

  let processedTitles = 0;

  for (let i = 0; i < titles.length; i += TITLE_BATCH_SIZE) {
    const batch = titles.slice(i, i + TITLE_BATCH_SIZE);

    // 1) Construir inputs: por cada título, 10 textos
    const expanded = [];
    const metaByTitle = batch.map(buildMetaText);

    for (let ti = 0; ti < batch.length; ti++) {
      const meta = metaByTitle[ti];
      for (const [, instruction] of PROFILE_DEFS) {
        expanded.push(`${instruction}\n\n---\nInformación del título:\n${meta}`);
      }
    }

    // 2) Voyage embeddings (devuelve batch.length*10 vectores)
    const vectors = await createEmbeddings(expanded);

    // 3) Mapear vectores a puntos Qdrant
    const points = [];
    let idx = 0;

    for (const t of batch) {
      for (let slot = 0; slot < PROFILE_DEFS.length; slot++) {
        const profile_type = PROFILE_DEFS[slot][0];

        // ✅ ID numérico determinista (válido en tu Qdrant)
        const pointId = t.title_id * 100 + slot;

        points.push({
          id: pointId,
          vector: vectors[idx++],
          payload: {
            title_id: t.title_id,
            tmdb_id: t.tmdb_id,
            type: t.type,
            title: t.title,
            profile_type,
            slot,
            year: t.year,
            language: t.language,
          },
        });
      }
    }

    // 4) Upsert en Qdrant
    await upsertToQdrant(points);

    processedTitles += batch.length;
    console.log(`✅ Batch OK: ${processedTitles}/${titles.length} títulos (${processedTitles * 10} vectores)`);
  }

  console.log("🎉 DONE: Perfiles subidos a Qdrant (title_profiles_v2)");
}

main().catch((err) => {
  console.error("❌ ERROR en embedTitleProfilesToQdrant.v2.mjs:");
  console.error(err);
  process.exit(1);
});