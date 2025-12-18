'use client';

import { useQVHStore } from '../store/qvh.store';

export default function TypeStep() {
  const setType = useQVHStore((s) => s.setType);

  return (
    <div className="py-10">
      <h2 className="text-3xl font-semibold">¿No sabes qué ver?</h2>
      <p className="opacity-70 mt-2">Te ayudamos a elegir algo que encaje contigo ahora mismo.</p>

      <div className="mt-8 grid grid-cols-3 gap-6">
        <button
          className="rounded-2xl border border-white/10 bg-white/5 px-6 py-10 hover:bg-white/10 transition"
          onClick={() => setType('movie')}
        >
          <div className="text-xl font-semibold">PELÍCULAS</div>
        </button>

        <button
          className="rounded-2xl border border-white/10 bg-white/5 px-6 py-10 hover:bg-white/10 transition"
          onClick={() => setType('series')}
        >
          <div className="text-xl font-semibold">SERIES</div>
        </button>

        <button
          className="rounded-2xl border border-white/10 bg-white/5 px-6 py-10 hover:bg-white/10 transition"
          onClick={() => setType('documentary')}
        >
          <div className="text-xl font-semibold">DOCUMENTALES</div>
        </button>
      </div>
    </div>
  );
}