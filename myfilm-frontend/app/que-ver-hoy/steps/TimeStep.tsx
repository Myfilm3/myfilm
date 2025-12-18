'use client';

import { useQVHStore } from '../store/qvh.store';
import type { QVHTime } from '../types';

export default function TimeStep() {
  const time = useQVHStore((s) => s.time);
  const setTime = useQVHStore((s) => s.setTime);
  const nextStep = useQVHStore((s) => s.nextStep);
  const prevStep = useQVHStore((s) => s.prevStep);

  const pick = (t: QVHTime) => {
    setTime(t);
    nextStep();
  };

  return (
    <div className="py-10">
      <h2 className="text-3xl font-semibold">Ajusta un poco más</h2>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          className={`rounded-full px-4 py-2 border ${time === '<90' ? 'border-yellow-400' : 'border-white/10'} bg-white/5 hover:bg-white/10`}
          onClick={() => pick('<90')}
        >
          Menos de 90 min
        </button>

        <button
          className={`rounded-full px-4 py-2 border ${time === '90-120' ? 'border-yellow-400' : 'border-white/10'} bg-white/5 hover:bg-white/10`}
          onClick={() => pick('90-120')}
        >
          90–120 min
        </button>

        <button
          className={`rounded-full px-4 py-2 border ${time === '>120' ? 'border-yellow-400' : 'border-white/10'} bg-white/5 hover:bg-white/10`}
          onClick={() => pick('>120')}
        >
          Más de 120 min
        </button>
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