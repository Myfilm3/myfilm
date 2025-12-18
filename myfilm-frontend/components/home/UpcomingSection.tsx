// components/home/UpcomingSection.tsx
'use client';

import PosterCard from '@/components/cards/PosterCard';

type Item = {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  media_type?: 'movie' | 'tv';
  release_date?: string;
  first_air_date?: string;
};

type Props = {
  items?: Item[];
};

function formatPremiere(raw?: string): string {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    // Si por lo que sea no parsea bien, devolvemos tal cual
    return raw;
  }

  // Ej: "25 ene 2026"
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function UpcomingSection({ items }: Props) {
  const pool = (items ?? []).filter(Boolean);

  if (!pool.length) return null;

  return (
    <section aria-label="Próximamente">
      <h2 className="text-xl md:text-2xl font-extrabold text-white mb-3">
        Próximamente
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
        {pool.map((item) => {
          const title = item.title || item.name || 'Sin título';
          const mediaType =
            item.media_type || (item.first_air_date ? 'tv' : 'movie');
          const href =
            mediaType === 'tv' ? `/series/${item.id}` : `/movies/${item.id}`;

          const rawDate = item.release_date || item.first_air_date || '';
          const premiereLabel = formatPremiere(rawDate);

          return (
            <div
              key={item.id}
              className="relative shrink-0 group"
            >
              <PosterCard
                id={item.id}
                title={title}
                poster_path={item.poster_path}
                href={href}
              />

              {/* Badge de estreno solo en hover (desktop/hover) */}
              {premiereLabel && (
                <div
                  className="
                    pointer-events-none
                    absolute inset-x-2 bottom-2
                    flex justify-center
                    opacity-0 group-hover:opacity-100
                    transition-opacity duration-200
                  "
                >
                  <span
                    className="
                      inline-flex items-center justify-center
                      rounded-full
                      bg-black/80
                      px-3 py-1
                      text-xs font-medium text-white
                      shadow-[0_6px_16px_rgba(0,0,0,0.6)]
                    "
                  >
                    Estreno {premiereLabel}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
