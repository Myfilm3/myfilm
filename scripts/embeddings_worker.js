import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

// =========================
// CONFIG
// =========================
const BATCH_SIZE = 50;
const SLEEP_MS = 1500;

// =========================
// DB
// =========================
const conn = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USERNAME || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_DATABASE || "myfilm",
});

// =========================
// MOCK embedding generator
// (aquí luego irá Voyage/OpenAI)
// =========================
async function generateEmbedding(text) {
  // placeholder: luego lo conectamos a Voyage
  return `emb:${Buffer.from(text).toString("base64").slice(0, 64)}`;
}

// =========================
// FETCH pendientes
// =========================
async function fetchPending(limit) {
  const [rows] = await conn.execute(
    `
    SELECT id_ext, tipo, title, year
    FROM mfb_index_item
    WHERE (embedding_status IS NULL OR embedding_status = 'pending')
    ORDER BY popularity DESC
    LIMIT ?
    `,
    [limit]
  );
  return rows;
}

// =========================
// MARCAR processing
// =========================
async function markProcessing(item) {
  await conn.execute(
    `
    UPDATE mfb_index_item
    SET embedding_status = 'processing',
        embedding_updated_at = NOW(),
        embedding_error = NULL
    WHERE id_ext = ? AND tipo = ?
    `,
    [item.id_ext, item.tipo]
  );
}

// =========================
// GUARDAR embedding
// =========================
async function saveEmbedding(item, embeddingRef) {
  await conn.execute(
    `
    INSERT INTO embeddings
      (title_id, tmdb_id, type, embedding_ref, model, year)
    VALUES (?, ?, ?, ?, 'voyage-3-large', ?)
    `,
    [
      item.id_ext,
      item.id_ext,
      item.tipo === "tv" ? "series" : "movie",
      embeddingRef,
      item.year,
    ]
  );

  await conn.execute(
    `
    UPDATE mfb_index_item
    SET embedding_status = 'done',
        embedding_updated_at = NOW()
    WHERE id_ext = ? AND tipo = ?
    `,
    [item.id_ext, item.tipo]
  );
}

// =========================
// ERROR
// =========================
async function markError(item, err) {
  await conn.execute(
    `
    UPDATE mfb_index_item
    SET embedding_status = 'error',
        embedding_error = ?,
        embedding_updated_at = NOW()
    WHERE id_ext = ? AND tipo = ?
    `,
    [String(err).slice(0, 480), item.id_ext, item.tipo]
  );
}

// =========================
// MAIN LOOP
// =========================
async function main() {
  console.log("🚀 embeddings-worker started");

  while (true) {
    const items = await fetchPending(BATCH_SIZE);

    if (!items.length) {
      console.log("✅ No quedan embeddings pendientes. Sleep.");
      await new Promise(r => setTimeout(r, 10000));
      continue;
    }

    console.log(`🔢 Procesando batch: ${items.length}`);

    for (const item of items) {
      try {
        await markProcessing(item);

        const text = `${item.title || ""} (${item.year || ""})`;
        const embeddingRef = await generateEmbedding(text);

        await saveEmbedding(item, embeddingRef);

        console.log(`✅ OK ${item.tipo}:${item.id_ext}`);
      } catch (err) {
        console.error(`❌ ERROR ${item.tipo}:${item.id_ext}`, err);
        await markError(item, err);
      }
    }

    await new Promise(r => setTimeout(r, SLEEP_MS));
  }
}

// =========================
main().catch(err => {
  console.error("💥 worker fatal:", err);
  process.exit(1);
});
