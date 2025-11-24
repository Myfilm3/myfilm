// myfilm-frontend/lib/userSettingsApi.ts

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3001/api';

export type UserSettings = {
  userId: number;
  kids_profile: boolean;
  kids_max_age: number | null;
  provider_tmdb_ids: number[];
};

export async function fetchUserSettings(): Promise<UserSettings> {
  const res = await fetch(`${API_BASE}/users/me/settings`, {
    // más adelante aquí pondremos el token real
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Error cargando settings: ${res.status}`);
  }

  return (await res.json()) as UserSettings;
}

export type UpdateUserSettingsPayload = {
  kidsProfile?: boolean;
  kidsMaxAge?: number | null;
  providerTmdbIds?: number[];
};

export async function updateUserSettings(
  payload: UpdateUserSettingsPayload,
): Promise<UserSettings> {
  const res = await fetch(`${API_BASE}/users/me/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Error guardando settings: ${res.status}`);
  }

  return (await res.json()) as UserSettings;
}
