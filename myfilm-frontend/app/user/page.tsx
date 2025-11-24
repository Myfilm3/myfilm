'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchUserSettings } from '@/lib/userSettingsApi';

type PrefContentType = 'movies' | 'series' | 'both';

type BackendUserProfile = {
  display_name?: string | null;
  nickname?: string | null;
  email?: string | null;
  favorite_genres?: string[] | null;
  pref_content_type?: PrefContentType | null;
  // 👇 aquí permitimos number | string por si el back devuelve strings
  providers?: (number | string)[] | null;
  followers_count?: number | null;
  following_count?: number | null;
  lists_count?: number | null;
  likes_count?: number | null;
  [key: string]: unknown;
};

type UserPanelState = {
  display_name: string;
  nickname: string;
  email: string;
  favorite_genres: string[];
  pref_content_type: PrefContentType;
  providers: number[]; // 👈 ya normalizado a números
  followers_count: number;
  following_count: number;
  lists_count: number;
  likes_count: number;
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

export default function UserPanelPage() {
  const [profile, setProfile] = useState<UserPanelState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const raw = (await fetchUserSettings()) as BackendUserProfile;
        if (cancelled) return;

        const {
          display_name,
          nickname,
          email,
          favorite_genres,
          pref_content_type,
          providers,
          followers_count,
          following_count,
          lists_count,
          likes_count,
        } = raw;

        // 🔧 NORMALIZAR PROVIDERS A number[]
        const normalizedProviders: number[] = Array.isArray(providers)
          ? providers
              .map((id) => Number(id))
              .filter((id) => Number.isFinite(id))
          : [];

        const safe: UserPanelState = {
          display_name:
            display_name || nickname || email || 'Tu nombre en MyFilm',
          nickname: nickname ?? '',
          email: email ?? '',
          favorite_genres: Array.isArray(favorite_genres)
            ? [...favorite_genres]
            : [],
          pref_content_type: pref_content_type ?? 'movies',
          providers: normalizedProviders,
          followers_count: followers_count ?? 0,
          following_count: following_count ?? 0,
          lists_count: lists_count ?? 0,
          likes_count: likes_count ?? 0,
        };

        setProfile(safe);
        setError(null);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError('No se ha podido cargar tu perfil.');
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

  if (loading || !profile) {
    return (
      <main className="px-6 py-10">
        <div className="max-w-5xl mx-auto">
          <p className="text-sm text-white/70">Cargando tu panel de usuario…</p>
        </div>
      </main>
    );
  }

  const contentLabel =
    profile.pref_content_type === 'movies'
      ? 'Más de películas'
      : profile.pref_content_type === 'series'
        ? 'Más de series'
        : 'Películas y series por igual';

  return (
    <main className="px-4 py-8 md:px-8 md:py-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* HERO PERFIL */}
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80">
          <div className="h-24 w-full bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.20),_transparent_60%)]" />

          <div className="px-6 pb-4 -mt-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="relative h-20 w-20 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center text-2xl font-semibold">
                  {profile.display_name.charAt(0).toUpperCase()}
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <p className="text-base font-semibold">
                    {profile.display_name}
                  </p>
                  {profile.nickname && (
                    <p className="text-xs text-white/70">
                      @{profile.nickname}
                    </p>
                  )}
                </div>

                {/* Redes (placeholder) */}
                <div className="flex items-center gap-2 text-xs text-white/80">
                  <span className="h-7 w-7 rounded-full bg-[#E1306C]" />
                  <span className="h-7 w-7 rounded-full bg-[#1877F2]" />
                  <span className="h-7 w-7 rounded-full bg-[#1DA1F2]" />
                </div>

                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full bg-[#FFB000] px-4 py-1.5 text-xs font-semibold text-black shadow-sm"
                >
                  + Seguir
                </button>
              </div>
            </div>

            <div className="flex flex-col items-start gap-3 md:items-end">
              <div className="flex flex-wrap gap-4 text-xs text-white/70">
                <div className="text-right">
                  <p className="font-semibold text-white">
                    {profile.followers_count}
                  </p>
                  <p>Seguidores</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-white">
                    {profile.following_count}
                  </p>
                  <p>Siguiendo</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-white">
                    {profile.lists_count}
                  </p>
                  <p>Listas creadas</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-white">
                    {profile.likes_count}
                  </p>
                  <p>Likes</p>
                </div>
              </div>

              <Link
                href="/user/settings"
                className="inline-flex items-center justify-center rounded-full bg-white/10 p-2 text-xs text-white hover:bg-white/20"
                aria-label="Configuración de cuenta"
              >
                ⚙️
              </Link>
            </div>
          </div>

          <div className="border-t border-white/10 px-4 md:px-6">
            <nav className="flex flex-wrap gap-4 text-xs">
              <button className="border-b-2 border-[#FFB000] pb-2 font-semibold text-white">
                Inicio
              </button>
              <button className="pb-2 text-white/70 hover:text-white">
                Watchgroups
              </button>
              <button className="pb-2 text-white/70 hover:text-white">
                Seguimiento
              </button>
              <button className="pb-2 text-white/70 hover:text-white">
                Likes
              </button>
            </nav>
          </div>

          <div className="px-6 pb-4">
            <p className="text-[11px] text-white/60">{contentLabel}</p>
          </div>
        </section>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {/* MIS GÉNEROS FAVORITOS */}
        <section className="rounded-2xl border border-white/10 bg-white/5 px-6 py-5 space-y-4">
          <h2 className="text-lg font-semibold">Mis géneros favoritos</h2>

          {profile.favorite_genres.length === 0 ? (
            <p className="text-sm text-white/60">
              Aún no has configurado tus géneros favoritos. Podrás hacerlo desde
              Configuración &gt; Perfil de usuario.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {profile.favorite_genres.map((g) => (
                <div
                  key={g}
                  className="rounded-xl bg-[linear-gradient(135deg,#1e293b,#020617)] border border-white/10 px-4 py-3 flex flex-col justify-between"
                >
                  <p className="text-sm font-semibold">{g}</p>
                  <p className="mt-2 text-[11px] text-white/60">
                    20% de tu tiempo visto
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* PLATAFORMAS CONECTADAS */}
        <section className="rounded-2xl border border-white/10 bg-white/5 px-6 py-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">
              Plataformas conectadas ({profile.providers.length})
            </h2>
            <Link
              href="/user/settings"
              className="text-xs text-white/70 hover:text-white"
            >
              Gestionar plataformas →
            </Link>
          </div>

          {profile.providers.length === 0 ? (
            <p className="text-sm text-white/60">
              No has marcado ninguna plataforma todavía. Puedes hacerlo en
              Configuración de cuenta.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {PROVIDERS.filter((p) =>
                profile.providers.includes(p.id),
              ).map((p) => (
                <div
                  key={p.id}
                  className="inline-flex items-center rounded-xl bg-black/60 border border-white/15 px-4 py-2 text-xs font-medium text-white"
                >
                  {p.short}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* RECOMENDACIONES (placeholder) */}
        <section className="rounded-2xl border border-white/10 bg-white/5 px-6 py-5 space-y-4">
          <h2 className="text-lg font-semibold">
            Recomendaciones no vistas en tus plataformas (próximamente)
          </h2>
          <p className="text-sm text-white/70">
            Aquí aparecerán recomendaciones personalizadas basadas en todo lo
            que veas y puntúes en MyFilm.
          </p>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[2/3] rounded-xl bg-black/30 border border-white/5"
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}