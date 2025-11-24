'use client';

import { useEffect, useState } from 'react';
import { fetchUserSettings, updateUserSettings } from '@/lib/userSettingsApi';

// Color acento MyFilm
const ACCENT = '#FFB000';

// Lo que devuelve el backend
type BackendUserSettings = {
  display_name?: string | null;
  email?: string | null;

  profile_public?: boolean | null;
  mylist_public?: boolean | null;
  notifications_enabled?: boolean | null;

  kids_profile?: boolean | null;
  kids_max_age?: number | null;

  show_social_links?: boolean | null;
  show_platforms?: boolean | null;
  provider_tmdb_ids?: number[] | null;

  [key: string]: unknown;
};

// Estado interno de la página de ajustes
type SettingsState = {
  display_name: string;
  email: string;

  profile_public: boolean;
  mylist_public: boolean;
  notifications_enabled: boolean;

  kids_enabled: boolean;
  kids_max_age: number;

  show_social_links: boolean;
  show_platforms: boolean;
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
  { id: 9, name: 'Prime Video', short: 'Prime Video' },
  { id: 337, name: 'Disney+', short: 'Disney+' },
  { id: 384, name: 'Max', short: 'Max' },
  { id: 179, name: 'Apple TV+', short: 'Apple TV+' },
  { id: 350, name: 'SkyShowtime', short: 'SkyShowtime' },
];

export default function UserSettingsPage() {
  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Cargar ajustes del backend
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);

        const raw = (await fetchUserSettings()) as BackendUserSettings;
        if (cancelled) return;

        const {
          display_name,
          email,
          profile_public,
          mylist_public,
          notifications_enabled,
          kids_profile,
          kids_max_age,
          show_social_links,
          show_platforms,
          provider_tmdb_ids,
          ...rest
        } = raw;

        const safe: SettingsState = {
          display_name: display_name ?? '',
          email: email ?? '',
          profile_public: profile_public ?? false,
          mylist_public: mylist_public ?? false,
          notifications_enabled: notifications_enabled ?? true,
          kids_enabled: kids_profile ?? false,
          kids_max_age: kids_max_age ?? 8,
          show_social_links: show_social_links ?? false,
          show_platforms: show_platforms ?? false,
          providers: Array.isArray(provider_tmdb_ids)
            ? [...provider_tmdb_ids]
            : [],
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

  const updateSettings = (partial: Partial<SettingsState>) => {
    setSettings((prev) =>
      prev ? { ...prev, ...partial } : ({ ...partial } as SettingsState),
    );
    setSaved(false);
    setError(null);
  };

  const toggleProvider = (providerId: number) => {
    if (!settings) return;

    const current = settings.providers;
    const next = current.includes(providerId)
      ? current.filter((id: number) => id !== providerId)
      : [...current, providerId];

    updateSettings({ providers: next });
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      setError(null);
      setSaved(false);

      const payload = {
        display_name: settings.display_name,
        email: settings.email,
        profile_public: settings.profile_public,
        mylist_public: settings.mylist_public,
        notifications_enabled: settings.notifications_enabled,
        kids_profile: settings.kids_enabled,
        kids_max_age: settings.kids_max_age,
        show_social_links: settings.show_social_links,
        show_platforms: settings.show_platforms,
        provider_tmdb_ids: settings.providers,
      };

      await updateUserSettings(payload as Record<string, unknown>);
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
      <main className="px-4 py-8 md:px-8 md:py-10">
        <div className="mx-auto w-[94vw] max-w-[1500px]">
          <p className="text-base text-white/70">Cargando tu configuración…</p>
        </div>
      </main>
    );
  }

  // Toggle reutilizable
  const Toggle = ({
    active,
    onClick,
  }: {
    active: boolean;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className="relative inline-flex h-8 w-14 items-center rounded-full transition-colors"
      style={{
        backgroundColor: active ? ACCENT : 'rgba(255,255,255,0.25)',
      }}
    >
      <span
        className={`inline-block h-6 w-6 transform rounded-full bg-black shadow-sm transition-transform ${
          active ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

  return (
    <main className="px-4 py-8 md:px-8 md:py-10">
      <div className="mx-auto w-[94vw] max-w-[1500px] space-y-6">
        {/* HEADER */}
        <header className="space-y-2">
          <h1 className="text-xl md:text-2xl font-semibold">
            Configuración de cuenta
          </h1>
          <p className="text-sm md:text-base text-white/70">
            Gestiona tu cuenta, privacidad, modo Kids, redes sociales y
            plataformas conectadas.
          </p>
        </header>

        {/* GRID PRINCIPAL */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* COLUMNA IZQUIERDA */}
          <div className="space-y-6">
            {/* CUENTA */}
            <section className="rounded-2xl bg-black/75 border border-white/10 px-6 py-5 flex gap-4">
              {/* Avatar */}
              <div className="shrink-0 flex items-center">
                <div className="relative h-20 w-20 rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-500 to-fuchsia-500">
                  <div className="absolute inset-0 flex items-center justify-center text-2xl font-semibold">
                    {settings.display_name
                      ? settings.display_name.charAt(0).toUpperCase()
                      : 'M'}
                  </div>
                </div>
              </div>

              {/* Datos */}
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm md:text-base font-semibold">
                      {settings.display_name || 'Tu nombre en MYFILM'}
                    </p>
                    <p className="text-xs md:text-sm text-white/75">
                      {settings.email || 'correoprueba@myfilm.es'}
                    </p>
                    <p className="text-xs md:text-sm text-white/60">
                      Contraseña:{' '}
                      <span className="tracking-widest">***********</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-full bg-white/10 p-2 text-xs md:text-sm text-white hover:bg-white/20"
                    aria-label="Editar datos de cuenta"
                  >
                    ✏️
                  </button>
                </div>
              </div>
            </section>

            {/* KIDS */}
            <section className="rounded-2xl bg-black/75 border border-white/10 px-6 py-5 space-y-4">
              <h2 className="text-base font-semibold">Kids</h2>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm md:text-base">
                    Habilitar control parental
                  </p>
                  <p className="text-xs md:text-sm text-white/65">
                    Aplica filtros infantiles y limita contenido no apto para
                    menores.
                  </p>
                </div>
                <Toggle
                  active={settings.kids_enabled}
                  onClick={() =>
                    updateSettings({ kids_enabled: !settings.kids_enabled })
                  }
                />
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm md:text-base">
                    Edad máxima de los niños
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-0.5 text-xs md:text-sm">
                    {settings.kids_max_age} años
                  </span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={16}
                  value={settings.kids_max_age}
                  onChange={(e) =>
                    updateSettings({ kids_max_age: Number(e.target.value) })
                  }
                  className="w-full accent-[#FFB000]"
                />
                <p className="text-xs md:text-sm text-white/65">
                  Nos ayuda a ajustar recomendaciones y restricciones de
                  contenido.
                </p>
              </div>
            </section>

            {/* PLATAFORMAS */}
            <section className="rounded-2xl bg-black/75 border border-white/10 px-6 py-5 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-base font-semibold">Plataformas</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs md:text-sm text-white/70">
                    Publicar plataformas
                  </span>
                  <Toggle
                    active={settings.show_platforms}
                    onClick={() =>
                      updateSettings({
                        show_platforms: !settings.show_platforms,
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {PROVIDERS.map((p) => {
                  const active = settings.providers.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleProvider(p.id)}
                      className={`rounded-full border px-4 py-1.5 text-xs md:text-sm font-medium transition ${
                        active
                          ? 'text-black'
                          : 'border-white/25 bg-white/5 text-white/85 hover:border-white/60'
                      }`}
                      style={
                        active
                          ? {
                              backgroundColor: ACCENT,
                              borderColor: ACCENT,
                            }
                          : {}
                      }
                    >
                      {p.short}
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          {/* COLUMNA DERECHA */}
          <div className="space-y-6">
            {/* PRIVACIDAD Y NOTIFICACIONES */}
            <section className="rounded-2xl bg-black/75 border border-white/10 px-6 py-5 space-y-4">
              <h2 className="text-base font-semibold">
                Privacidad y notificaciones
              </h2>

              {/* Perfil público */}
              <div className="flex items-center justify-between gap-4 rounded-xl bg-black/50 px-4 py-3">
                <div>
                  <p className="text-sm md:text-base">Habilitar perfil público</p>
                  <p className="text-xs md:text-sm text-white/65">
                    Permite que otros usuarios puedan ver tu perfil.
                  </p>
                </div>
                <Toggle
                  active={settings.profile_public}
                  onClick={() =>
                    updateSettings({
                      profile_public: !settings.profile_public,
                    })
                  }
                />
              </div>

              {/* MyList público */}
              <div className="flex items-center justify-between gap-4 rounded-xl bg-black/50 px-4 py-3">
                <div>
                  <p className="text-sm md:text-base">MyList público</p>
                  <p className="text-xs md:text-sm text-white/65">
                    Tus listas podrán consultarse desde tu perfil público.
                  </p>
                </div>
                <Toggle
                  active={settings.mylist_public}
                  onClick={() =>
                    updateSettings({
                      mylist_public: !settings.mylist_public,
                    })
                  }
                />
              </div>

              {/* Notificaciones */}
              <div className="flex items-center justify-between gap-4 rounded-xl bg-black/50 px-4 py-3">
                <div>
                  <p className="text-sm md:text-base">
                    Recibir notificaciones
                  </p>
                  <p className="text-xs md:text-sm text-white/65">
                    Avisos sobre nuevos estrenos, cambios en títulos que sigues
                    y recordatorios.
                  </p>
                </div>
                <Toggle
                  active={settings.notifications_enabled}
                  onClick={() =>
                    updateSettings({
                      notifications_enabled: !settings.notifications_enabled,
                    })
                  }
                />
              </div>
            </section>

            {/* REDES SOCIALES */}
            <section className="rounded-2xl bg-black/75 border border-white/10 px-6 py-5 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-base font-semibold">Redes sociales</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs md:text-sm text-white/70">
                    Publicar redes sociales
                  </span>
                  <Toggle
                    active={settings.show_social_links}
                    onClick={() =>
                      updateSettings({
                        show_social_links: !settings.show_social_links,
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2 text-xs md:text-sm">
                {['Instagram', 'Facebook', 'Twitter', 'Pinterest', 'Snapchat'].map(
                  (net) => (
                    <div
                      key={net}
                      className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 border border-white/15"
                    >
                      <div className="h-6 w-6 rounded-full bg-white/20" />
                      <span className="text-white/85">{net}</span>
                    </div>
                  ),
                )}
              </div>
            </section>
          </div>
        </div>

        {/* MENSAJES */}
        {error && <p className="text-sm md:text-base text-red-400">{error}</p>}
        {saved && !error && (
          <p className="text-sm md:text-base text-emerald-400">
            Cambios guardados correctamente.
          </p>
        )}

        {/* BOTÓN INFERIOR */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-full py-3 text-sm md:text-base font-semibold text-black shadow-md disabled:opacity-60"
            style={{ backgroundColor: ACCENT }}
          >
            {saving ? 'Guardando configuración…' : 'Guardar configuración'}
          </button>
        </div>
      </div>
    </main>
  );
}