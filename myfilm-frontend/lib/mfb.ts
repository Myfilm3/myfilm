// myfilm-frontend/lib/mfb.ts
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3001/api';

export type MfbRecommendation = {
  title_id: number;
  tmdb_id: number;
  title: string;
  original_title: string | null;
  year: number | null;
  genres: number[];
  vote_average: number;
  popularity: number;
  poster_path: string | null;
  backdrop_path: string | null;
  source_bucket: string | null;
  score: number;
};

export async function getMfbRelatedByTitleId(titleId: number, limit = 22) {
  const url = `${API_BASE}/mfb/recommendations/by-title?titleId=${titleId}&limit=${limit}`;
  const res = await fetch(url, { cache: 'no-store' });

  if (!res.ok) {
    throw new Error(`MFB error ${res.status}`);
  }

  const data = await res.json() as {
    titleId: number;
    count: number;
    results: MfbRecommendation[];
  };

  // Por si devuelve más de 22, recortamos aquí
  return data.results.slice(0, 22);
}