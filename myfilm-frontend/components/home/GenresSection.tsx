// components/home/GenresSection.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';

const GENRES = [
  { label: 'Acción',          slug: 'accion',          from: '#0000003c', to: '#D100FF' },
  { label: 'Animacion',         slug: 'animacion',         from: '#0000003c', to: '#e89cf5ff' },
  { label: 'Belico e Historia', slug: 'belico', from: '#0000003c', to: '#653404ff' },
  { label: 'Comedia',       slug: 'comedia',       from: '#0000003c', to: '#009dffff' },
  { label: 'Ciencia Ficcion',       slug: 'ciencia-ficcion',       from: '#0000003c', to: '#120af8ff' },
  { label: 'Crimen',           slug: 'crimen',           from: '#0000003c', to: '#f60303ff' },
  { label: 'Drama',        slug: 'drama',        from: '#0000003c', to: '#e8b80cff' },
  { label: 'Misterio',          slug: 'misterio',          from: '#0000003c', to: '#7b061eff' },
  { label: 'Romance',          slug: 'romance',          from: '#0000003c', to: '#f01a45ff' },
  { label: 'Terror',          slug: 'terror',          from: '#0000003c', to: '#91283dff' },
  { label: 'Westen',          slug: 'western',          from: '#0000003c', to: '#f7d306ff' },
  { label: 'Documentales',          slug: 'documentales',          from: '#0000003c', to: '#0003a1ff' },
];

export default function GenresSection() {
  return (
    <section aria-label="Géneros y ayuda para elegir" className="space-y-10">
      {/* CABECERA + TARJETAS DE GÉNERO */}
      <div className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg md:text-xl font-extrabold text-white">
            ¿Qué género quieres ver?
          </h2>
          <Link
            href="/generos"
            className="text-xs md:text-sm font-medium text-white/70 hover:text-white underline underline-offset-4"
          >
            Ver todos los géneros
          </Link>
        </div>

        {/* fila de géneros, tamaño carátula */}
        <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {GENRES.map((g) => (
            <Link
              key={g.slug}
              href={`/generos?g=${encodeURIComponent(g.slug)}`}
              className="
                relative
                shrink-0
                w-[140px] md:w-[250px]
                h-[190px] md:h-[400px]
                rounded-2xl
                overflow-hidden
                border border-white/10
                shadow-[0_18px_40px_rgba(0,0,0,0.55)]
                transition
                hover:-translate-y-[3px]
                hover:shadow-[0_22px_48px_rgba(0,0,0,0.75)]
              "
            >
              {/* SOLO COLOR DIFUMINADO */}
              <div
                className="absolute inset-0"
                style={{
                  background: `
                    radial-gradient(circle at 0% 0%, rgba(255,255,255,0.18), transparent 55%),
                    linear-gradient(135deg, ${g.from}, ${g.to})
                  `,
                }}
              />
              <div className="absolute inset-0 bg-black/25 mix-blend-multiply" />
             <div className="relative h-full flex items-end justify-center px-4 pb-4">
  <span className="text-lg md:text-xl font-semibold text-white drop-shadow text-center">
    {g.label}
  </span>
</div>
            </Link>
          ))}
        </div>
      </div>

      {/* CTA “¿Aún con todo, todavía no sabes qué ver?” */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-8 items-stretch">
        {/* Texto izquierda – sin caja de fondo marcada */}
        <div className="flex flex-col justify-center max-w-xl">
          <h3 className="text-2xl md:text-3xl font-extrabold text-white">
            ¿Aún con todo no sabes todavía qué ver?
          </h3>

          {/* línea amarilla */}
          <div className="mt-3 h-[3px] w-100 bg-gradient-to-r from-[#FFC42E] to-[#FF9F1C] rounded-full" />

          <p className="mt-4 text-sm md:text-base text-white/80">
           Entra a nuestro formulario interactivo y elige que contenido ver en solo tres clicks.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href="/que-ver-hoy"
              className="
                inline-flex items-center justify-center
                px-6 py-2.5
                rounded-full
                bg-[#FFB020]
                text-sm md:text-base
                font-semibold
                text-black
                shadow-[0_12px_30px_rgba(255,176,32,0.6)]
                hover:brightness-110
                transition
              "
            >
              Haz click aquí
            </Link>
          </div>
        </div>

        {/* Imagen derecha grande */}
        <div
          className="
            relative
            rounded-3xl
            overflow-hidden
            border border-white/10
            shadow-[0_22px_55px_rgba(0,0,0,0.8)]
            min-h-[400px] md:min-h-[400px] lg:min-h-[600px]
          "
        >
          <Image
            src="/legacy/images/bg_quever.jpg"
            alt="Plataformas de streaming compatibles con MYFILM"
            fill
            sizes="(min-width: 1024px) 40vw, 100vw"
            className="object-cover scale-110 translate-y-2"
          />
          {/* ligera capa de color para integrar con el fondo */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#020617]/80 via-transparent to-[#0f9cff]/35 mix-blend-multiply" />
        </div>
      </div>
    </section>
  );
}