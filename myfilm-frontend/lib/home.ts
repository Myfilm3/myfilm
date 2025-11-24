// myfilm-frontend/lib/home.ts
import { API } from './api';

export type PlatformItem = {
  id: number | string;
  name?: string;
  logo_path?: string | null;
  link?: string | null;      // enlace a Watchmode / plataforma, cuando lo tengamos
};

export type MediaItem = {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  media_type?: 'movie' | 'serie'; // en tu PHP pones 'serie' / 'movie'
  url?: string;
  runtime?: number | null;
  logo_path?: string | null;
  certification?: string | null;
  teaser?: string | null;         // URL YouTube embebida
  plataformas?: PlatformItem[];   // ✅ tipado, sin any
};

export type CollectionItem = {
  id: number;
  name: string;
  overview?: string | null;
  backdrop_path?: string | null;
  poster_path?: string | null;
  parts?: MediaItem[];
};

export type HomePrivatePayload = {
  hero: { results: MediaItem[] };
  recomendaciones: { results: MediaItem[] };
  mejores_valoradas: { results: MediaItem[] };
  myfilm_mas_visto: { results: MediaItem[] };
  contenido_relacionado: { results: MediaItem[] };
  proximamente: { results: MediaItem[] };
  contenido_otros: { results: MediaItem[] };
  mejores_colecciones: CollectionItem[];
  base_titulo: string;
};

export async function getHomePrivate(): Promise<HomePrivatePayload> {
  const url = `${API}/home-private`; // ⚠️ este endpoint lo tiene que exponer tu back
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error('HomePrivate failed');
  return res.json() as Promise<HomePrivatePayload>;
}