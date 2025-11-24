'use client';

import { useEffect, useState } from 'react';
import { fetchUserSettings, updateUserSettings } from '@/lib/userSettingsApi';

type PrefContentType = 'movies' | 'series' | 'both';

type BackendUserProfileSettings = {
  nickname?: string | null;
  real_name?: string | null;
  pref_content_type?: PrefContentType | null;
  favorite_genres?: string[] | null;
  [key: string]: unknown;
};

type ProfileSettings = {
  nickname: string;
  real_name: string;
  pref_content_type: PrefContentType;
  favorite_genres: string[];
  [key: string]: unknown;
};

const ALL_GENRES: string[] = [
  'Acción',
  'Aventura',
  'Comedia',
  'Animación',
  'Drama',
  'Thriller',
  'Ciencia ficción',
  'Fantasía',
  'Terror suave',
  'Romántica',
  'Familiar',
  'Documental',
];

export default function OnboardingProfilePage() {
  const [settings, setSettings] = useState<ProfileSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Cargar datos existentes del usuario
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const raw = (await fetchUserSettings()) as unknown as BackendUserProfileSettings;

        if (cancelled) return;

        const {
          nickname,
          real_name,
          pref_content_type,
          favorite_genres,
          ...rest
        } = raw;

        const safe: ProfileSettings = {
          nickname: nickname ?? '',
          real_name: real_name ?? '',
          pref_content_type: pref_content_type ?? 'movies',
          favorite_genres: Array.isArray(favorite_genres)
            ? [...favorite_genres]
            : [],
          ...rest,
        };

        setSettings(safe);
        setError(null);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError('No se ha podido cargar tu perfil. Inténtalo de nuevo.');
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

  const updateSettings = (partial: Partial<ProfileSettings>) => {
    setSettings((prev) =>
      prev ? { ...prev, ...partial } : ({ ...partial } as ProfileSettings),
    );
    setSaved(false);
  };

const toggleGenre = (genre: string) => {
  if (!settings) return;

  const exists = settings.favorite_genres.includes(genre);
  const currentCount = settings.favorite_genres.length;

  // ❌ Si ya tiene 6, no permitir añadir más
  if (!exists && currentCount >= 6) {
    setError('Puedes elegir un máximo de 6 géneros.');
    return;
  }

  const next = exists
    ? settings.favorite_genres.filter((g) => g !== genre)
    : [...settings.favorite_genres, genre];

  updateSettings({ favorite_genres: next });

  // Limpia error si vuelve a estar dentro del rango
  if (next.length <= 6) setError(null);
};

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      setError(null);
      setSaved(false);

      await updateUserSettings(
        settings as unknown as Record<string, unknown>,
      );

      setSaved(true);
    } catch (e) {
      console.error(e);
      setError('No se han podido guardar los cambios.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <main className="px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <p className="text-sm text-white/70">Cargando tu perfil…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Título */}
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Perfil de usuario</h1>
          <p className="text-sm text-white/70">
            Personaliza tu identidad en MyFilm y afina tus preferencias. Más
            adelante conectaremos estos datos con MyFilmBrain para mejorar las
            recomendaciones.
          </p>
        </header>

        {/* Identidad / Nickname */}
        <section className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold">Tu nombre en MyFilm</h2>
            <p className="text-xs text-white/60">
              Este será el nombre que verás en tu perfil y en futuras funciones
              sociales (listas compartidas, comentarios, etc.).
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-white/70">
                Nickname / alias
              </label>
              <input
                type="text"
                value={settings.nickname}
                onChange={(e) =>
                  updateSettings({ nickname: e.target.value })
                }
                placeholder="Ejemplo: Salva, Star, cinéfilo_81…"
                className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/60"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-white/70">
                Nombre real (opcional)
              </label>
              <input
                type="text"
                value={settings.real_name}
                onChange={(e) =>
                  updateSettings({ real_name: e.target.value })
                }
                placeholder="Nombre y apellidos si quieres mostrarlo"
                className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/60"
              />
            </div>
          </div>
        </section>

        {/* Pelis vs Series */}
        <section className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold">¿Qué te gusta más ver?</h2>
            <p className="text-xs text-white/60">
              Usaremos esto como punto de partida para priorizar películas o
              series cuando no tengamos suficiente historial tuyo.
            </p>
          </div>

          <div className="inline-flex rounded-full bg-black/40 p-1 text-xs">
            <button
              type="button"
              onClick={() =>
                updateSettings({ pref_content_type: 'movies' })
              }
              className={`rounded-full px-4 py-1.5 ${
                settings.pref_content_type === 'movies'
                  ? 'bg-white text-black font-medium'
                  : 'text-white/80 hover:bg-white/10'
              }`}
            >
              Películas
            </button>
            <button
              type="button"
              onClick={() =>
                updateSettings({ pref_content_type: 'series' })
              }
              className={`rounded-full px-4 py-1.5 ${
                settings.pref_content_type === 'series'
                  ? 'bg-white text-black font-medium'
                  : 'text-white/80 hover:bg-white/10'
              }`}
            >
              Series
            </button>
            <button
              type="button"
              onClick={() =>
                updateSettings({ pref_content_type: 'both' })
              }
              className={`rounded-full px-4 py-1.5 ${
                settings.pref_content_type === 'both'
                  ? 'bg-white text-black font-medium'
                  : 'text-white/80 hover:bg-white/10'
              }`}
            >
              Ambas por igual
            </button>
          </div>
        </section>

        {/* Géneros favoritos */}
        <section className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold">Géneros que más te gustan</h2>
            <p className="text-xs text-white/60">
              Elige algunos géneros clave. Más adelante podrás afinarlos y
              añadir muchos más desde el quiz completo.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {ALL_GENRES.map((g) => {
              const active = settings.favorite_genres.includes(g);
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleGenre(g)}
                  className={`rounded-full border px-3 py-1 transition ${
                    active
                      ? 'border-white bg-white text-black'
                      : 'border-white/20 bg-white/5 text-white/80 hover:border-white/50'
                  }`}
                >
                  {g}
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-white/50">
            Consejo: empieza con 4–6 géneros y deja que MyFilm vaya aprendiendo
            del resto según lo que veas y puntúes.
          </p>
        </section>

        {/* Quiz de gustos (placeholder) */}
        <section className="rounded-xl border border-dashed border-white/15 bg-black/30 p-6 space-y-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold">
              Quiz de gustos (próximamente)
            </h2>
            <p className="text-xs text-white/60">
              Un recorrido rápido de 2–3 minutos donde elegirás películas,
              series y estilos visuales. Servirá para darle un empujón inicial a
              tu recomendador personal MyFilmBrain.
            </p>
          </div>

          <button
            type="button"
            className="rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-white"
          >
            Hacer el quiz (Próximamente)
          </button>
        </section>

        {/* Mensajes y guardar */}
        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}
        {saved && !error && (
          <p className="text-sm text-emerald-400">Cambios guardados.</p>
        )}

        <div className="flex justify-end pt-2">
         <button
  type="button"
  onClick={handleSave}
  disabled={saving || settings.favorite_genres.length < 2}
  className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black disabled:opacity-60"
>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </main>
  );
}
