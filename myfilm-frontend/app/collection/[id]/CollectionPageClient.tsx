// app/collection/[id]/CollectionPageClient.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Container from '@/components/layout/Container';
import {
  getCollection,
  type CollectionDetails,
  type CollectionPart,
} from '@/lib/api';

export default function CollectionPageClient() {
  const params = useParams();

  const rawId =
    typeof params?.id === 'string'
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : null;

  const [collection, setCollection] = useState<CollectionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!rawId) {
      setError('ID de colección no encontrado.');
      setLoading(false);
      return;
    }

    const tmdbId = Number(rawId);
    if (!Number.isFinite(tmdbId) || tmdbId <= 0) {
      setError('ID de colección no válido.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await getCollection(tmdbId);
        if (cancelled) return;

        if (!data) {
          setError('Colección no encontrada.');
          setLoading(false);
          return;
        }

        setCollection(data);
      } catch (e) {
        if (!cancelled) setError('Error cargando la colección.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [rawId]);

  if (loading) {
    return (
      <Container>
        <div className="min-h-[60vh] flex items-center justify-center text-white">
          Cargando colección…
        </div>
      </Container>
    );
  }

  if (error || !collection) {
    return (
      <Container>
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-white gap-2">
          <p className="text-lg font-semibold">
            {error ?? 'Colección no encontrada.'}
          </p>
          <code className="text-xs bg-black/60 px-2 py-1 rounded border border-white/10">
            /collection/&lt;id_tmdb_colección&gt;
          </code>
        </div>
      </Container>
    );
  }

  const bgPath = collection.backdrop_path ?? collection.parts?.[0]?.backdrop_path ?? null;
  const backgroundUrl = bgPath
    ? `https://image.tmdb.org/t/p/original${bgPath}`
    : null;

  const movies: CollectionPart[] = collection.parts ?? [];

  return (
    <div className="relative min-h-screen text-white">
      {/* FONDO FIJO DETRÁS DEL MENÚ */}
      {backgroundUrl && (
        <div className="fixed inset-0 -z-10">
          <img
            src={backgroundUrl}
            alt={collection.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/10" />
        </div>
      )}

      <Container>
        <main className="py-10 space-y-8 max-w-5xl">
          {/* CABECERA */}
          <header className="space-y-3 max-w-3xl">
            <h1 className="text-3xl sm:text-4xl font-semibold drop-shadow-lg">
              {collection.name}
            </h1>

            {movies.length > 0 && (
              <p className="text-sm text-white/80">
                {movies
                  .map((m) => (m.release_date || '').slice(0, 4))
                  .filter(Boolean)
                  .sort()
                  .slice(0, 2)
                  .join(' – ')}
              </p>
            )}

            {collection.overview && (
              <p className="text-base text-white/85 leading-relaxed">
                {collection.overview}
              </p>
            )}
          </header>

          {/* PELÍCULAS DE LA COLECCIÓN */}
          {movies.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wide">
                Películas de la colección
              </h2>

              <div className="flex gap-4 overflow-x-auto pb-3">
                {movies.map((m) => {
                  const title = m.title || m.name || 'Sin título';
                  const poster = m.poster_path
                    ? `https://image.tmdb.org/t/p/w342${m.poster_path}`
                    : null;
                  const year = (m.release_date || '').slice(0, 4);

                  return (
                    <Link
                      key={m.id}
                      href={`/movies/${m.id}`}
                      className="group min-w-[150px] max-w-[150px] rounded-lg overflow-hidden bg-black/60 border border-white/10 shadow-[0_10px_25px_rgba(0,0,0,0.7)] hover:-translate-y-1 transition-transform"
                    >
                      {poster ? (
                        <img
                          src={poster}
                          alt={title}
                          className="w-full aspect-[2/3] object-cover transition-transform duration-200 group-hover:scale-[1.04]"
                        />
                      ) : (
                        <div className="w-full aspect-[2/3] flex items-center justify-center text-xs text-white/60 bg-black/40">
                          Sin póster
                        </div>
                      )}

                      <div className="p-2 space-y-1">
                        <p className="text-xs font-medium line-clamp-2">
                          {title}
                        </p>
                        {year && (
                          <p className="text-[0.7rem] text-white/70">{year}</p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </main>
      </Container>
    </div>
  );
}