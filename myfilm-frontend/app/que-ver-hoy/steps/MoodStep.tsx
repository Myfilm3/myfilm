'use client';

import { MOODS } from '../types';
import { useQVHStore } from '../store/qvh.store';

export default function MoodStep() {
  const mood = useQVHStore((s) => s.mood);
  const setMood = useQVHStore((s) => s.setMood);
  const nextStep = useQVHStore((s) => s.nextStep);
  const prevStep = useQVHStore((s) => s.prevStep);

  return (
    <div className="py-10">
      <h2 className="text-3xl font-semibold">¿Qué te apetece sentir hoy?</h2>
      <p className="opacity-70 mt-2">Toca una emoción para continuar (avance automático).</p>

      <div className="mt-8 grid grid-cols-6 gap-4">
        {MOODS.map((m) => (
          <button
            key={m.key}
            onClick={() => {
              setMood(m.key);
              nextStep();
            }}
            className={[
              'rounded-2xl border px-4 py-10 text-left transition',
              'border-white/10 bg-white/5 hover:bg-white/10',
              mood === m.key ? 'ring-2 ring-yellow-400' : '',
            ].join(' ')}
          >
            <div className="font-semibold text-lg">{m.label}</div>
          </button>
        ))}
      </div>

      <div className="mt-8 flex gap-3">
        <button
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10"
          onClick={prevStep}
        >
          Atrás
        </button>
      </div>
    </div>
  );
}