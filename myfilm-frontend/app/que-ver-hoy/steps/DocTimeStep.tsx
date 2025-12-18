'use client';

import { useQVHStore } from '../store/qvh.store';
import type { DocTime } from '../types';

export default function DocTimeStep() {
  const docTime = useQVHStore((s) => s.docTime);
  const setDocTime = useQVHStore((s) => s.setDocTime);
  const nextStep = useQVHStore((s) => s.nextStep);
  const prevStep = useQVHStore((s) => s.prevStep);

  const pick = (t: DocTime) => {
    setDocTime(t);
    nextStep();
  };

  return (
    <div className="py-10">
      <h2 className="text-3xl font-semibold">¿Cuánto tiempo tienes?</h2>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          className={`rounded-full px-4 py-2 border ${docTime === '<40' ? 'border-yellow-400' : 'border-white/10'} bg-white/5 hover:bg-white/10`}
          onClick={() => pick('<40')}
        >
          Menos de 40 min
        </button>

        <button
          className={`rounded-full px-4 py-2 border ${docTime === '>40' ? 'border-yellow-400' : 'border-white/10'} bg-white/5 hover:bg-white/10`}
          onClick={() => pick('>40')}
        >
          Más de 40 min
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