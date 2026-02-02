import fs from "fs";

const QDRANT_URL = (process.env.QDRANT_URL || "").replace(/\/+$/, "");
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || "";
const COLLECTION = process.env.QDRANT_COLLECTION || "title_profiles_v2";

if (!QDRANT_URL) {
  console.error("Missing QDRANT_URL");
  process.exit(1);
}

const headers = { "Content-Type": "application/json" };
if (QDRANT_API_KEY) headers["api-key"] = QDRANT_API_KEY;

async function post(path, body) {
  const r = await fetch(`${QDRANT_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return await r.json();
}

async function main() {
  const outFile = "tmp/qdrant_title_ids.txt";
  const seen = new Set();

  let offset = null;
  let points = 0;

  console.log(`[qdrant] scrolling collection=${COLLECTION} ...`);

  for (let guard = 0; guard < 200000; guard++) {
    const body = {
      limit: 512,
      with_payload: true,
      with_vector: false,
    };
    if (offset !== null) body.offset = offset;

    const resp = await post(`/collections/${COLLECTION}/points/scroll`, body);
    const pts = resp?.result?.points ?? [];
    const next = resp?.result?.next_page_offset ?? null;

    if (!pts.length) break;

    for (const p of pts) {
      points++;
      const payload = p.payload || {};
      const titleId = Number(payload.title_id ?? 0);
      if (Number.isFinite(titleId) && titleId > 0) seen.add(titleId);
    }

    if (guard % 50 === 0) {
      console.log(`[qdrant] pages=${guard} points=${points} unique_title_ids=${seen.size}`);
    }

    offset = next;
    if (offset === null) break;
  }

  const arr = [...seen].sort((a, b) => a - b);
  fs.writeFileSync(outFile, arr.join("\n") + "\n", "utf8");
  console.log(`[qdrant] DONE unique_title_ids=${arr.length} -> ${outFile}`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
