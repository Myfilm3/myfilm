// scripts/embedTitleProfiles.mjs
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import 'dotenv/config';

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;
const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;

// ⚠️ Modelo 1024-dim para que case con Qdrant (Title_profiles = 1024)
const VOYAGE_MODEL = 'voyage-3'; // o 'voyage-3-large', ambos 1024 dims

// Nombre de la colección de perfiles en Qdrant
const QDRANT_COLLECTION_PROFILES = 'Title_profiles';

// --- Helpers ---

async function createEmbeddings(texts) {
  const res = await axios.post(
    'https://api.voyageai.com/v1/embeddings',
    {
      model: VOYAGE_MODEL,
      input: texts,
      input_type: 'document',
    },
    {
      headers: {
        Authorization: `Bearer ${VOYAGE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    }
  );

  return res.data.data.map((d) => d.embedding);
}

async function upsertProfiles(points) {
  const payload = { points };

  const res = await axios.put(
    `${QDRANT_URL}/collections/${QDRANT_COLLECTION_PROFILES}/points?wait=true`,
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
        'api-key': QDRANT_API_KEY,
      },
      timeout: 60000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    }
  );

  if (res.data.status && res.data.status.error) {
    console.error('❌ Error Qdrant:', res.data);
    throw new Error('Qdrant error: ' + JSON.stringify(res.data.status));
  }
}

// Genera 10 textos/perfil para un título
function buildProfilesForTitle(title) {
  const base = `${title.title} (${title.year || 'Año desconocido'})`;
  const genres = (title.genres || []).join(',');
  const lang = title.language || 'unknown';
  const bucket = title.source_bucket || '';

  const profiles = [];

  profiles.push(
    `${base} es una película de géneros [${genres}] con nota media ${title.vote_average} y popularidad ${title.popularity}. Idioma original: ${lang}. Fuente: ${bucket}.`
  );
  profiles.push(
    `Película: ${base}. Géneros TMDB: [${genres}]. Muy bien valorada por los usuarios (${title.vote_average}/10 con ${title.vote_count} votos).`
  );
  profiles.push(
    `${base}. Popularidad ${title.popularity}. Géneros: [${genres}]. Idioma original ${lang}.`
  );
  profiles.push(
    `Título: ${base}. Bucket: ${bucket}. Puntuación: ${title.vote_average}.`
  );
  profiles.push(
    `${base}, película ${lang}, rating ${title.vote_average}, votos ${title.vote_count}.`
  );
  profiles.push(
    `${base}. Recomendable para fans de los géneros [${genres}] y películas valoradas alrededor de ${title.vote_average}.`
  );
  profiles.push(
    `${base}. Clasificada como ${bucket}. Popularidad aproximada ${title.popularity}.`
  );
  profiles.push(
    `Película: ${base}. Géneros: [${genres}]. Idioma: ${lang}.`
  );
  profiles.push(
    `${base}. Ficha técnica breve: géneros [${genres}], idioma ${lang}, año ${title.year || 'N/A'}.`
  );
  profiles.push(
    `${base}. Película incluida en el bucket ${bucket} con rating ${title.vote_average} y popularidad ${title.popularity}.`
  );

  return profiles;
}

// --- MAIN ---

async function main() {
  if (!VOYAGE_API_KEY || !QDRANT_URL || !QDRANT_API_KEY) {
    console.error('❌ Falta VOYAGE_API_KEY, QDRANT_URL o QDRANT_API_KEY en el .env');
    process.exit(1);
  }

  const dataPath = path.join(process.cwd(), 'data', 'titles_seed.json');
  if (!fs.existsSync(dataPath)) {
    console.error('❌ No existe data/titles_seed.json');
    process.exit(1);
  }

  const titles = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const TOTAL_TITLES = titles.length;
  const PROFILES_PER_TITLE = 10;

  console.log(`Generando ${PROFILES_PER_TITLE} perfiles para ${TOTAL_TITLES} títulos...`);

  // procesamos en batches de N títulos
  const TITLES_PER_BATCH = 32; // 32 títulos * 10 perfiles = 320 embeddings por batch

  let batchIndex = 0;

  while (batchIndex * TITLES_PER_BATCH < TOTAL_TITLES) {
    const start = batchIndex * TITLES_PER_BATCH;
    const end = Math.min(start + TITLES_PER_BATCH, TOTAL_TITLES);
    const slice = titles.slice(start, end);

    console.log(
      `Batch ${batchIndex + 1} → títulos ${start + 1}-${end} (${(end - start) *
        PROFILES_PER_TITLE} perfiles)`
    );

    // 1) Construir textos para todos los perfiles de este batch
    const texts = [];
    const meta = []; // para saber a qué título/perfil corresponde cada texto

    for (const t of slice) {
      const profiles = buildProfilesForTitle(t); // array de 10 strings
      profiles.forEach((text, profileIdx) => {
        texts.push(text);
        meta.push({
          title_id: t.title_id,
          profile_index: profileIdx,
        });
      });
    }

    // 2) Llamar a Voyage
    const embeddings = await createEmbeddings(texts);

    // 3) Convertir a points para Qdrant
    const points = embeddings.map((embedding, i) => {
      const { title_id, profile_index } = meta[i];

      // ID numérico único: title_id * 10 + profile_index
      const pointId = title_id * PROFILES_PER_TITLE + profile_index;

      return {
        id: pointId,
        vector: embedding, // 1024-dim
        payload: {
          title_id,
          profile_index,
        },
      };
    });

    // 4) Upsert en Qdrant
    await upsertProfiles(points);

    batchIndex++;
  }

  console.log('✅ Todos los perfiles de título subidos correctamente a Qdrant');
}

main().catch((err) => {
  console.error('❌ ERROR en embedTitleProfiles.mjs:');
  console.error(err);
  process.exit(1);
});