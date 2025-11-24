// src/users/dto/update-user-settings.dto.ts
import { IsArray, IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateUserSettingsDto {
  @IsOptional()
  @IsBoolean()
  kidsProfile?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  kidsMaxAge?: number | null;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  providerTmdbIds?: number[];
}