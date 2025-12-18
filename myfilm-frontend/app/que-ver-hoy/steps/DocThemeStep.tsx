'use client';

import { DOC_THEMES } from '../types';
import { useQVHStore } from '../store/qvh.store';

export default function DocThemeStep() {
  const docTheme = useQVHStore((s) => s.docTheme);
  const setDocTheme = useQVHStore((s) => s.setDocTheme);
  const nextStep = useQVHStore((s) => s.nextStep);
  const prevStep = useQVHStore((s) => s.prevStep);

  return (
    <div className="py-10">
      <h2 className="text-3xl font-semibold">¿Qué tipo de documental?</h2>
      <p className="opacity-70 mt-2">Elige una temática para continuar.</p>

      <div className="mt-8 grid grid-cols-3 gap-4">
        {DOC_THEMES.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setDocTheme(t.key);
              nextStep();
            }}
            className={[
              'rounded-2xl border px-5 py-6 text-left transition',
              'border-white/10 bg-white/5 hover:bg-white/10',
              docTheme === t.key ? 'ring-2 ring-yellow-400' : '',
            ].join(' ')}
          >
            <div className="font-semibold">{t.label}</div>
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