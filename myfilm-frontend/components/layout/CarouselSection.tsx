// components/layout/CarouselSection.tsx
'use client';

import PosterCard from '@/components/cards/PosterCard';

type Item = {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
  media_type?: 'movie' | 'tv';
};

type CarouselSectionProps = {
  title: string;
  items: Item[];
};

export default function CarouselSection({
  title,
  items = [],
}: CarouselSectionProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold px-[1vw]">{title}</h2>

      <div className="flex gap-4 overflow-x-auto pb-2 px-[1vw]">
        {items.map((m) => {
          // CAMBIO: si es tv → 'series' en lugar de 'tv'
          const type: 'movies' | 'series' =
            m.media_type === 'tv' || (!m.title && m.name) ? 'series' : 'movies';

          return (
            <PosterCard
              key={m.id}
              id={m.id}
              title={m.title || m.name || ''}
              poster_path={m.poster_path}
              backdrop_path={m.backdrop_path}
              year={(m.release_date || m.first_air_date || '').slice(0, 4)}
              rating={m.vote_average}
              href={`/${type}/${m.id}`}   // ahora ya apunta bien
            />
          );
        })}
      </div>
    </section>
  );
}
