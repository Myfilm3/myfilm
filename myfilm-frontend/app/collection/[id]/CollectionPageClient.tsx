// app/collection/[id]/CollectionPageClient.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Container from '@/components/layout/Container';
import {
  getCollection,
  type CollectionDetails,
  type CollectionPart,
} from '@/lib/api';

export default function CollectionPageClient() {
  // 1) BAJAR / SUBIR TODO el contenido (en píxeles)
  //    - ejemplo: 0, 40, 80, 120...
  const CONTENT_TOP_PX = 500;

  // 2) EMPUJAR A LA IZQUIERDA (en rem)
  //    - sube/baja hasta que el inicio del contenido quede “donde está todo”
  //    - ejemplo: 0, 6, 8, 10, 12...
  const SHIFT_REM = 11;

  // 3) ANCHO EXTRA del carrusel hacia la derecha (en píxeles)
  //    - ejemplo: 0, 120, 240, 360...
  const CAROUSEL_EXTRA_PX = 550;

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
      } catch {
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
          <Image
            src={backgroundUrl}
            alt={collection.name}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/10" />
        </div>
      )}

      <Container>
        <main
          className="py-10 space-y-8 max-w-5xl"
          style={{
            marginTop: `${CONTENT_TOP_PX}px`,
            transform: `translateX(-${SHIFT_REM}rem)`,
          }}
        >
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

              <div
                className="overflow-x-auto overflow-y-visible pt-6 pb-6"
                style={{ width: `calc(100% + ${CAROUSEL_EXTRA_PX}px)` }}
              >
                <div className="grid grid-flow-col auto-cols-[200px] gap-4 pr-2 overflow-visible">
                  {movies.map((m) => {
                    const title = m.title || m.name || 'Sin título';
                    const poster = m.poster_path
                      ? `https://image.tmdb.org/t/p/w342${m.poster_path}`
                      : null;

                    return (
                      <Link
                        key={m.id}
                        href={`/movies/${m.id}`}
                        className="group w-[200px] h-[300px] rounded-lg transition-transform duration-200 hover:scale-[1.06] hover:-translate-y-2 hover:z-10"
                      >
                        <div className="w-full h-full rounded-lg overflow-hidden bg-black/60 border border-white/10 shadow-[0_10px_25px_rgba(0,0,0,0.7)]">
                          {poster ? (
                            <Image
                              src={poster}
                              alt={title}
                              width={200}
                              height={300}
                              sizes="200px"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-white/60 bg-black/40">
                              Sin póster
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </section>
          )}
        </main>
      </Container>
    </div>
  );
}
