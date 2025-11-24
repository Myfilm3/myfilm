import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import { TmdbService } from '../../tmdb/tmdb.service';

@ApiTags('Person')
@UseInterceptors(CacheInterceptor)
@Controller('person')
export class PersonController {
  constructor(private readonly tmdb: TmdbService) {}

  @Get(':id')
  @ApiParam({ name: 'id', example: 287 })
  async details(@Param('id') id: string) {
    return this.tmdb.getPerson({ id });
  }
}
