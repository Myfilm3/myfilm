'use client';

import { useQVHStore } from '../store/qvh.store';
import type { QVHContext } from '../types';

export default function ContextStep() {
  const context = useQVHStore((s) => s.context);
  const setContext = useQVHStore((s) => s.setContext);
  const nextStep = useQVHStore((s) => s.nextStep);
  const prevStep = useQVHStore((s) => s.prevStep);

  const pick = (c: QVHContext) => {
    setContext(c);
    nextStep();
  };

  return (
    <div className="py-10">
      <h2 className="text-3xl font-semibold">Ajusta un poco más</h2>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          className={`rounded-full px-4 py-2 border ${context === 'solo' ? 'border-yellow-400' : 'border-white/10'} bg-white/5 hover:bg-white/10`}
          onClick={() => pick('solo')}
        >
          Sol@
        </button>
        <button
          className={`rounded-full px-4 py-2 border ${context === 'pareja' ? 'border-yellow-400' : 'border-white/10'} bg-white/5 hover:bg-white/10`}
          onClick={() => pick('pareja')}
        >
          En pareja
        </button>
        <button
          className={`rounded-full px-4 py-2 border ${context === 'amigos' ? 'border-yellow-400' : 'border-white/10'} bg-white/5 hover:bg-white/10`}
          onClick={() => pick('amigos')}
        >
          Con amigos
        </button>
        <button
          className={`rounded-full px-4 py-2 border ${context === 'familia' ? 'border-yellow-400' : 'border-white/10'} bg-white/5 hover:bg-white/10`}
          onClick={() => pick('familia')}
        >
          En familia
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