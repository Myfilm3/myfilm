// app/onboarding/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchUserSettings, updateUserSettings } from '@/lib/userSettingsApi';

// Tipo que usamos para lo que nos interesa del backend
type BackendUserSettings = {
  kids_enabled?: boolean | null;
  kids_max_age?: number | null;
  providers?: number[] | null;
  [key: string]: unknown;
};

// Tipo limpio que usaremos en el onboarding
type OnboardingSettings = {
  kids_enabled: boolean;
  kids_max_age: number;
  providers: number[];
  [key: string]: unknown;
};

type ProviderDef = {
  id: number;
  name: string;
  short: string;
};

const PROVIDERS: ProviderDef[] = [
  { id: 8, name: 'Netflix', short: 'Netflix' },
  { id: 9, name: 'Prime Video', short: 'Prime' },
  { id: 337, name: 'Disney+', short: 'Disney+' },
  { id: 384, name: 'Max', short: 'Max' },
  { id: 179, name: 'Apple TV+', short: 'Apple TV+' },
  { id: 350, name: 'SkyShowtime', short: 'SkyShowtime' },
];

export default function OnboardingPage() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<OnboardingSettings | null>(null);

  // Cargar settings del backend
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);

        const raw = (await fetchUserSettings()) as BackendUserSettings;

        if (cancelled) return;

        const { kids_enabled, kids_max_age, providers, ...rest } = raw;

        const safe: OnboardingSettings = {
          kids_enabled: kids_enabled ?? false,
          kids_max_age: kids_max_age ?? 8,
          providers: Array.isArray(providers) ? [...providers] : [],
          ...rest,
        };

        setSettings(safe);
        setError(null);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError('No se han podido cargar tus ajustes. Inténtalo de nuevo.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateSettings = (partial: Partial<OnboardingSettings>) => {
    setSettings((prev) =>
      prev ? { ...prev, ...partial } : ({ ...partial } as OnboardingSettings),
    );
  };

  const toggleProvider = (providerId: number) => {
    if (!settings) return;

    const current = settings.providers;
    const next = current.includes(providerId)
      ? current.filter((id: number) => id !== providerId)
      : [...current, providerId];

    updateSettings({ providers: next });
  };

  // Ahora este "finish" nos lleva al paso 3 (perfil) del onboarding
  const handleFinish = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      setError(null);

      await updateUserSettings(settings as unknown as Record<string, unknown>);
      router.push('/onboarding/profile');
    } catch (e) {
      console.error(e);
      setError('No se han podido guardar los cambios.');
    } finally {
      setSaving(false);
    }
  };

  const canGoNext = step === 1 ? true : (settings?.providers.length ?? 0) > 0;

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl space-y-8">
        {/* Header */}
        <header className="space-y-2">
          <p className="text-sm text-white/60">Paso {step} de 3</p>
          <h1 className="text-3xl font-semibold">
            Terminemos de ajustar tu cuenta MyFilm
          </h1>
          <p className="text-sm text-white/70">
            Esto nos ayudará a personalizar mejor las recomendaciones desde el
            primer día. Podrás cambiar todo más adelante en Configuración.
          </p>

          <div className="mt-4 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/80 transition-all"
              style={{ width: step === 1 ? '33%' : '66%' }}
            />
          </div>
        </header>

        {loading && (
          <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-8 text-sm text-white/70">
            Cargando tus ajustes…
          </div>
        )}

        {!loading && settings && (
          <>
            {/* Paso 1: Kids */}
            {step === 1 && (
              <section className="space-y-6 rounded-xl border border-white/10 bg-white/5 px-6 py-6">
                <h2 className="text-lg font-semibold">Perfil Kids</h2>
                <p className="text-sm text-white/70">
                  Activa el modo infantil y dinos hasta qué edad aproximada
                  quieres que adaptemos el contenido.
                </p>

                <div className="flex items-center justify-between gap-4 rounded-lg bg-black/20 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">
                      Activar filtros infantiles
                    </p>
                    <p className="text-xs text-white/60">
                      Recomendaciones adaptadas a niños y control de contenido.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      updateSettings({
                        kids_enabled: !settings.kids_enabled,
                      })
                    }
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                      settings.kids_enabled
                        ? 'bg-emerald-400'
                        : 'bg-white/25'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-black transition-transform ${
                        settings.kids_enabled ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Edad máxima aproximada de los niños</span>
                    <span className="rounded-full bg-white/10 px-3 py-0.5 text-xs">
                      {settings.kids_max_age} años
                    </span>
                  </div>
                  <input
                    type="range"
                    min={3}
                    max={16}
                    value={settings.kids_max_age}
                    onChange={(e) =>
                      updateSettings({
                        kids_max_age: Number(e.target.value),
                      })
                    }
                    className="w-full accent-white"
                  />
                  <p className="text-xs text-white/60">
                    Usaremos este dato solo como referencia para filtrar
                    contenido familiar.
                  </p>
                </div>
              </section>
            )}

            {/* Paso 2: Plataformas */}
            {step === 2 && (
              <section className="space-y-6 rounded-xl border border-white/10 bg-white/5 px-6 py-6">
                <h2 className="text-lg font-semibold">
                  ¿Dónde tienes tus plataformas?
                </h2>
                <p className="text-sm text-white/70">
                  Marca en qué plataformas tienes cuenta. MyFilm priorizará
                  mostrarte contenido disponible en ellas.
                </p>

                <div className="flex flex-wrap gap-2">
                  {PROVIDERS.map((p) => {
                    const active = settings.providers.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleProvider(p.id)}
                        className={`rounded-full border px-4 py-1.5 text-sm transition ${
                          active
                            ? 'border-white bg-white text-black'
                            : 'border-white/20 bg-white/5 text-white/80 hover:border-white/40'
                        }`}
                      >
                        {p.short}
                      </button>
                    );
                  })}
                </div>

                <p className="text-xs text-white/60">
                  Podrás añadir más plataformas o cambiar estas opciones cuando
                  quieras desde Configuración &gt; Tus plataformas.
                </p>
              </section>
            )}
          </>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        {!loading && (
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => (step === 1 ? router.push('/') : setStep(1))}
              className="text-sm text-white/70 hover:text-white"
            >
              {step === 1 ? 'Saltar por ahora' : 'Volver'}
            </button>

            <div className="flex items-center gap-3">
              {step === 1 && (
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
                >
                  Continuar
                </button>
              )}

              {step === 2 && (
                <button
                  type="button"
                  disabled={!canGoNext || saving}
                  onClick={handleFinish}
                  className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black disabled:opacity-60"
                >
                  {saving ? 'Guardando…' : 'Continuar'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
