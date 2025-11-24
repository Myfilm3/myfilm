// src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';

export type UserSettingsResponse = {
  userId: number;
  kids_profile: boolean;
  kids_max_age: number | null;
  provider_tmdb_ids: number[];
};

@Injectable()
export class UsersService {
  /**
   * Pequeño almacén en memoria.
   * Clave = userId, Valor = configuración del usuario.
   */
  private readonly store = new Map<number, UserSettingsResponse>();

  // Valores por defecto si el usuario aún no tiene nada guardado
  private buildDefault(userId: number): UserSettingsResponse {
    return {
      userId,
      kids_profile: false,
      kids_max_age: null,
      // Por defecto: Netflix, Prime, Max, Apple, Disney+, SkyShowtime
      provider_tmdb_ids: [8, 9, 337, 384, 350, 531],
    };
  }

  /**
   * Devuelve las settings del usuario.
   * Si no existen en memoria, las crea con valores por defecto.
   */
  async getSettingsByUserId(userId: number): Promise<UserSettingsResponse> {
    let current = this.store.get(userId);

    if (!current) {
      current = this.buildDefault(userId);
      this.store.set(userId, current);
    }

    return current;
  }

  /**
   * Actualiza (en memoria) la configuración del usuario.
   * Más adelante conectaremos esto a MariaDB.
   */
  async updateSettings(
    userId: number,
    dto: UpdateUserSettingsDto,
  ): Promise<UserSettingsResponse> {
    const current = await this.getSettingsByUserId(userId);

    const updated: UserSettingsResponse = {
      userId,
      kids_profile:
        typeof dto.kidsProfile === 'boolean'
          ? dto.kidsProfile
          : current.kids_profile,

      kids_max_age:
        typeof dto.kidsMaxAge === 'number'
          ? dto.kidsMaxAge
          : current.kids_max_age,

      provider_tmdb_ids:
        Array.isArray(dto.providerTmdbIds) && dto.providerTmdbIds.length > 0
          ? dto.providerTmdbIds
          : current.provider_tmdb_ids,
    };

    this.store.set(userId, updated);
    return updated;
  }
}