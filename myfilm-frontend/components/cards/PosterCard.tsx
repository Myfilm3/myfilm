'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { MouseEvent } from 'react';

type PosterCardProps = {
  id: number;
  title?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;   // segunda imagen (fondo cara trasera)
  year?: string;                   // año
  rating?: number;                 // valoración TMDB
  duration?: string;               // duración ya formateada, ej: "2h 35min" o "147 min"
  href?: string;                   // a dónde navega al click

  onPlay?: (id: number) => void;
  onMore?: (id: number) => void;
  onAdd?: (id: number) => void;
};

function stop(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
}

export default function PosterCard({
  id,
  title,
  poster_path,
  backdrop_path,
  year,
  rating,
  duration,
  href,
  onPlay,
  onMore,
  onAdd,
}: PosterCardProps) {
  const posterSrc = poster_path
    ? `https://image.tmdb.org/t/p/w500${poster_path}`
    : '/placeholder-poster.jpg';

  const backSrc = backdrop_path
    ? `https://image.tmdb.org/t/p/w500${backdrop_path}`
    : posterSrc;

  // Tamaño común del póster
  const sizeClasses =
    'shrink-0 w-[160px] sm:w-[170px] md:w-[200px] lg:w-[230px] xl:w-[250px] aspect-[2/3]';

  const cardContent = (
    <div
      className={`${sizeClasses} relative rounded-lg overflow-hidden bg-neutral-900 [perspective:1200px] focus-within:ring-2 ring-white/60`}
      tabIndex={0}
      aria-label={title || 'Póster'}
    >
      {/* Contenedor 3D */}
      <div className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] group-focus-visible:[transform:rotateY(180deg)]">
        {/* CARA FRONTAL */}
        <div className="absolute inset-0 [backface-visibility:hidden]">
          <Image
            src={posterSrc}
            alt={title || 'Póster'}
            fill
            sizes="(max-width: 768px) 150px, (max-width: 1024px) 200px, (max-width: 1536px) 230px, 250px"
            className="object-cover"
          />

          {/* Overlay acciones */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          <div className="absolute inset-0 flex items-end justify-center pb-3 gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {/* Más info */}
            <button
              onClick={(e) => {
                stop(e);
                onMore?.(id);
              }}
              className="pointer-events-auto px-2.5 py-1.5 rounded bg-black/70 text-white text-sm font-medium hover:bg-black/80 focus:outline-none focus:ring-2 ring-white"
              aria-label="Más información"
              title="Más información"
            >
              i
            </button>
          </div>
        </div>

        {/* CARA TRASERA */}
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-lg overflow-hidden bg-neutral-950">
          {/* Segunda imagen de fondo */}
          <Image
            src={backSrc}
            alt={title || 'Fondo'}
            fill
            sizes="(max-width: 768px) 150px, (max-width: 1024px) 200px, (max-width: 1536px) 230px, 250px"
            className="object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/10" />

          <div className="absolute inset-0 flex flex-col justify-end p-3 text-xs text-slate-50 gap-1">
            {/* Nombre */}
            <h3 className="text-[18px] font-semibold line-clamp-2">
              {title}
            </h3>

            {/* Año • Rating • Duración */}
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[15px] text-slate-200/90">
              {year && <span>{year}</span>}

              {typeof rating === 'number' && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-400/10 text-amber-300 text-[15px]">
                  ★ {rating.toFixed(1)}
                </span>
              )}

              {duration && (
                <span className="text-slate-100/90">
                  {duration}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Envolvemos en Link si hay href para navegar a la ficha
  if (href) {
    return (
      <Link href={href} className="group inline-block">
        {cardContent}
      </Link>
    );
  }

  // Sin href (por si lo reutilizamos en otro sitio)
  return <div className="group inline-block">{cardContent}</div>;
}