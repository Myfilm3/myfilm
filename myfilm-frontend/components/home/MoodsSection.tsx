// myfilm-frontend/components/home/MoodsSection.tsx
'use client';

import { useState } from 'react';

type Mood = {
  label: string;
  href: string;
  color: string; // color al hacer hover
};

const MOODS: Mood[] = [
  { label: 'Noche de risas', href: '/quever?emocion=Noche%20de%20risas', color: '#1A7091' },
  { label: 'Pensar un rato', href: '/quever?emocion=Pensar%20un%20rato', color: '#073544' },
  { label: 'Acción, un montón', href: '/quever?emocion=Caña%20al%20mono', color: '#6C006D' },
  { label: 'Estar en tensión', href: '/quever?emocion=Estar%20en%20tensión', color: '#1D2832' },
  { label: 'Pasarlo de miedo', href: '/quever?emocion=Pasarlo%20de%20miedo', color: '#4D080C' },
  { label: 'Quiero llorar', href: '/quever?emocion=Quiero%20llorar', color: '#4091C3' },
  { label: 'Ir a otros mundos', href: '/quever?emocion=Ir%20a%20otro%20mundo', color: '#1172B4' },
  { label: 'Basada en hechos reales', href: '/quever?emocion=Basado%20en%20hechos%20reales', color: '#030508' },
  { label: 'Joyas escondidas', href: '/quever?emocion=Joya%20escondida', color: '#CC8A03' },
  { label: 'La dirección importa', href: '/quever?emocion=La%20dirección%20importa', color: '#161A1E' },
  { label: 'Para ver con colegas', href: '/quever?emocion=Para%20ver%20con%20colegas', color: '#00404D' },
  { label: 'Rápida y ligera', href: '/quever?emocion=Rápida%20y%20ligera', color: '#EB7F08' },
];

const BASE_BG = '#050B14';

function MoodCard({ mood }: { mood: Mood }) {
  const [hovered, setHovered] = useState(false);

  const bgColor = hovered ? mood.color : BASE_BG;
  const scale = hovered ? 1.03 : 1;

  return (
    <a
      href={mood.href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="
        shrink-0
        w-[240px] h-[120px]
        md:w-[240px] md:h-[120px]
        rounded-2xl
        flex items-center justify-center text-center
        px-3
        font-extrabold
        text-[15px] leading-snug
        text-white
        border border-white/10
        shadow-[0_14px_28px_rgba(0,0,0,0.35),_0_10px_24px_rgba(0,0,0,0.25)]
        transition-all duration-150
        cursor-pointer
      "
      style={{
        backgroundColor: bgColor,
        transform: `scale(${scale})`,
      }}
    >
      <span>{mood.label}</span>
    </a>
  );
}

export default function MoodsSection() {
  return (
    <section aria-label="¿Qué te apetece sentir hoy?">
      <h2 className="text-xl md:text-2xl font-extrabold text-white mb-3">
        ¿Qué te apetece sentir hoy?
      </h2>

      <div
        className="
          flex gap-3 overflow-x-auto pb-2
          [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
        "
      >
        {MOODS.map((mood) => (
          <MoodCard key={mood.label} mood={mood} />
        ))}
      </div>
    </section>
  );
}