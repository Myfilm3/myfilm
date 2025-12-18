// scripts/embedTitlesToQdrant.inception.mjs
import fs from "fs";
import path from "path";
import "dotenv/config";
import { randomUUID } from "crypto";

const VOYAGE_KEY = process.env.VOYAGE_API_KEY;
const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;

// Tu colección de test ya creada en Qdrant:
const COLLECTION_NAME = "title_profiles_v2_test";

// 10 perfiles
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

async function createEmbeddings(texts) {
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${VOYAGE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "voyage-3", // usa el mismo que te aparece en Voyage dashboard
      input: texts,
    }),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Voyage error ${res.status}: ${msg}`);
  }

  const data = await res.json();
  return data.data.map((e) => e.embedding);
}

async function uploadBatchToQdrant(points) {
  const url = `${QDRANT_URL}/collections/${COLLECTION_NAME}/points`;
  const body = { points };

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "api-key": QDRANT_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Qdrant error ${res.status}: ${msg}`);
  }

  return res.json();
}

function buildMetaText(t) {
  const genres = (t.genres_names || []).join(", ");
  const cast = (t.cast_top || []).join(", ");
  const parts = [
    `Título: ${t.title}`,
    `Título original: ${t.original_title}`,
    t.year ? `Año: ${t.year}` : null,
    t.language ? `Idioma original: ${t.language}` : null,
    t.director ? `Director: ${t.director}` : null,
    cast ? `Reparto principal: ${cast}` : null,
    genres ? `Géneros: ${genres}` : null,
    t.tagline ? `Tagline: ${t.tagline}` : null,
    t.overview ? `Sinopsis: ${t.overview}` : null,
  ].filter(Boolean);

  return parts.join("\n");
}

async function main() {
  if (!VOYAGE_KEY) throw new Error("Missing VOYAGE_API_KEY in .env");
  if (!QDRANT_URL) throw new Error("Missing QDRANT_URL in .env");
  if (!QDRANT_API_KEY) throw new Error("Missing QDRANT_API_KEY in .env");

  const filePath = path.join(process.cwd(), "data", "titles_seed_inception.json");
  const arr = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!Array.isArray(arr) || arr.length !== 1) {
    throw new Error("titles_seed_inception.json debe contener exactamente 1 título.");
  }

  const t = arr[0];
  const meta = buildMetaText(t);

  // 1) Generar 10 textos (uno por perfil)
  const inputs = PROFILE_DEFS.map(([_, instruction]) => {
    return `${instruction}\n\n---\nInformación del título:\n${meta}`;
  });

  console.log(`🧠 Generando 10 embeddings para title_id=${t.title_id} (${t.title})...`);
  const vectors = await createEmbeddings(inputs);

  // 2) Guardar JSONL local (auditoría)
  const outJsonl = path.join(process.cwd(), "data", "inception_title_profiles_v2_test.jsonl");
  const jsonlLines = PROFILE_DEFS.map(([profile_type], i) => ({
    title_id: t.title_id,
    profile_type,
    slot: i,
    vector: vectors[i],
  }));
  fs.writeFileSync(
    outJsonl,
    jsonlLines.map((x) => JSON.stringify(x)).join("\n") + "\n",
    "utf8"
  );
  console.log(`📦 Guardado: ${outJsonl}`);

  // 3) Preparar puntos para Qdrant
  // IMPORTANTE: Qdrant en tu cluster solo acepta point IDs numéricos o UUID.
  // Usamos UUID y guardamos title_id/profile_type/slot en payload.
  const points = PROFILE_DEFS.map(([profile_type], i) => ({
    id: randomUUID(), // ✅ válido (UUID)
    vector: vectors[i],
    payload: {
      title_id: t.title_id,
      tmdb_id: t.tmdb_id,
      type: t.type,
      title: t.title,
      profile_type,
      slot: i,
      // (opcional) mini resumen de control:
      year: t.year,
      language: t.language,
    },
  }));

  // 4) Subir a Qdrant
  const res = await uploadBatchToQdrant(points);
  console.log("✅ Upsert OK:", res);
  console.log(`🎉 Listo: 10 puntos subidos a ${COLLECTION_NAME}`);
}

main().catch((err) => {
  console.error("❌ ERROR en embedTitlesToQdrant.inception.mjs:");
  console.error(err);
  process.exit(1);
});