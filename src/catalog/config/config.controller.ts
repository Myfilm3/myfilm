import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { TmdbService } from '../../tmdb/tmdb.service';

@ApiTags('Config')
@UseInterceptors(CacheInterceptor)
@Controller('config')
export class ConfigController {
  constructor(private readonly tmdb: TmdbService) {}

  // Configuración base (tamaños de imagen, etc.)
  @Get()
  async config() {
    return this.tmdb.getConfiguration();
  }

  // Listado oficial de proveedores por tipo y región
  @Get('providers')
  @ApiQuery({ name: 'type', required: true, enum: ['movie', 'tv'] })
  @ApiQuery({ name: 'region', required: false, example: 'ES' })
  async providers(
    @Query('type') type: 'movie' | 'tv',
    @Query('region') region?: string,
  ) {
    return this.tmdb.getProviderList({ type, region });
  }
}
