// components/home/GenresStrip.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';

type GenreDef = {
  slug: string;
  label: string;
  color: string;
};

const GENRES: GenreDef[] = [
  { slug: 'accion',        label: 'Acción',                 color: '#F97316' },
  { slug: 'comedia',       label: 'Comedia',                color: '#22C55E' },
  { slug: 'drama',         label: 'Drama',                  color: '#38BDF8' },
  { slug: 'thriller',      label: 'Thriller',               color: '#FACC15' },
  { slug: 'terror',        label: 'Terror',                 color: '#EF4444' },
  { slug: 'ciencia-ficcion', label: 'Ciencia ficción',      color: '#6366F1' },
  { slug: 'animacion',     label: 'Animación',              color: '#EC4899' },
  { slug: 'romantica',     label: 'Romántica',              color: '#FB7185' },
  { slug: 'documental',    label: 'Documental',             color: '#14B8A6' },
  { slug: 'familiar',      label: 'Familiar',               color: '#2DD4BF' },
  { slug: 'western',       label: 'Western',                color: '#FACC15' },
  { slug: 'crimen',        label: 'Crimen',                 color: '#A855F7' },
];

export default function GenresStrip() {
  return (
    <section aria-label="Explora por género">
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* CTA izquierda */}
        <Link
          href="/generos"
          className="
            relative
            w-full
            lg:w-[32%]
            rounded-3xl
            overflow-hidden
            bg-slate-900
            min-h-[220px]
            md:min-h-[260px]
          "
        >
          {/* IMPORTANTE: cambia la ruta si tu CTA es otra */}
          <Image
            src="/legacy/images/cta-generos.webp"
            alt="Explora por género"
            fill
            sizes="(min-width: 1024px) 32vw, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
          <div className="absolute inset-0 flex items-end">
            <div className="p-5 md:p-6 lg:p-7 max-w-xs">
              <p className="text-sm font-semibold text-white/80 tracking-[0.18em] uppercase">
                Explora MYFILM
              </p>
              <h2 className="mt-2 text-2xl md:text-3xl font-extrabold text-white">
                Descubre por género
              </h2>
              <p className="mt-3 text-sm text-white/85">
                Encuentra lo que te apetece en segundos: acción, drama, comedia,
                animación y mucho más.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-white/85">
                Ver todos los géneros
                <span aria-hidden>›</span>
              </span>
            </div>
          </div>
        </Link>

        {/* Lista de géneros derecha */}
        <div className="lg:w-[68%]">
          <h2 className="text-xl md:text-2xl font-extrabold text-white mb-3">
            Géneros
          </h2>
          <div
            className="
              flex flex-wrap gap-3
              lg:max-h-[260px]
              lg:overflow-y-auto
            "
          >
            {GENRES.map((g) => (
              <Link
                key={g.slug}
                href={`/generos?g=${encodeURIComponent(g.slug)}`}
                className="
                  inline-flex items-center justify-center
                  rounded-2xl
                  px-4 py-3
                  text-sm md:text-base font-semibold
                  text-white
                  shadow-[0_10px_25px_rgba(0,0,0,0.45)]
                  hover:shadow-[0_14px_32px_rgba(0,0,0,0.6)]
                  transition
                  min-w-[140px]
                "
                style={{
                  backgroundImage: `linear-gradient(135deg, ${g.color}, rgba(15,23,42,0.95))`,
                }}
              >
                {g.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}