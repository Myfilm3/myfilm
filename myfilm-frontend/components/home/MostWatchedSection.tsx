// components/home/MostWatchedSection.tsx
'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import PosterCard from '@/components/cards/PosterCard';

type Item = {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  backdrop_path?: string | null;
  poster_path?: string | null;
  vote_average?: number;
  media_type?: 'movie' | 'tv';
  release_date?: string;
  first_air_date?: string;
};

type Props = {
  title?: string;
  items?: Item[];
};

export default function MostWatchedSection({ title, items }: Props) {
  const pool = useMemo(() => (items ?? []).filter(Boolean), [items]);
  const [activeIndex, setActiveIndex] = useState(0);
  const active = pool[activeIndex] ?? null;

  if (!pool.length || !active) return null;

  const activeTitle = active.title || active.name || 'Sin título';
  const year = (active.release_date || active.first_air_date || '').slice(0, 4);
  const rating =
    typeof active.vote_average === 'number'
      ? Math.round(active.vote_average * 10)
      : null;

  const bg = active.backdrop_path || active.poster_path;
  const bgSrc = bg
    ? `https://image.tmdb.org/t/p/original${bg}`
    : '/legacy/images/placeholder-hero.jpg';

  const media = active.media_type || (active.first_air_date ? 'tv' : 'movie');
  const activeHref =
    media === 'tv' ? `/series/${active.id}` : `/movies/${active.id}`;

  return (
    <section aria-label={title ?? 'Lo más visto en tus plataformas'}>
      {/* contenedor: en desktop columnas con misma altura */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Panel grande izquierda */}
        <Link
          href={activeHref}
          className="
            relative group
            w-full
            lg:w-[40%]
            rounded-3xl
            overflow-hidden
            bg-slate-900
            min-h-[360px]
            md:min-h-[600px]
            lg:min-h-[600px]
          "
        >
          <Image
            src={bgSrc}
            alt={activeTitle}
            fill
            sizes="(min-width: 1024px) 40vw, 100vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />

          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-black/55 to-transparent" />
          <div className="absolute inset-0 flex items-end">
            <div className="p-5 md:p-6 lg:p-7 max-w-[90%] md:max-w-[85%] lg:max-w-[80%]">
              <h3 className="text-2xl md:text-3xl font-extrabold text-white drop-shadow">
                {activeTitle}
              </h3>

              {(rating !== null || year) && (
                <div className="mt-2 flex items-center gap-3 text-sm text-white/80">
                  {rating !== null && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-xs font-semibold">
                      ⭐ {rating}%
                    </span>
                  )}
                  {year && (
                    <span className="text-xs md:text-sm opacity-90">
                      {year}
                    </span>
                  )}
                </div>
              )}

              {active.overview && (
                <p className="mt-3 text-sm md:text-base text-white/90 max-w-none line-clamp-4 md:line-clamp-5">
                  {active.overview}
                </p>
              )}
            </div>
          </div>
        </Link>

        {/* Carrusel derecho + título centrado verticalmente */}
        <div className="lg:w-[58%] flex flex-col lg:justify-center">
          {/* título desktop en hueco superior del carrusel */}
          <h2 className="hidden lg:block text-xl md:text-2xl font-extrabold text-white mb-4">
            {title ?? 'Lo más visto en tus plataformas'}
          </h2>

          {/* título móvil arriba normal */}
          <h2 className="lg:hidden text-xl md:text-2xl font-extrabold text-white mb-3">
            {title ?? 'Lo más visto en tus plataformas'}
          </h2>

          <div
            className="
              flex gap-3
              overflow-x-auto
              pb-2
              [scrollbar-width:none]
              [&::-webkit-scrollbar]:hidden
            "
          >
            {pool.map((item, idx) => {
              const title = item.title || item.name || 'Sin título';
              const mediaType =
                item.media_type || (item.first_air_date ? 'tv' : 'movie');
              const href =
                mediaType === 'tv'
                  ? `/series/${item.id}`
                  : `/movies/${item.id}`;

              return (
                <div
                  key={item.id}
                  className="shrink-0"
                  onMouseEnter={() => setActiveIndex(idx)}
                >
                  <PosterCard
                    id={item.id}
                    title={title}
                    poster_path={item.poster_path}
                    href={href}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}