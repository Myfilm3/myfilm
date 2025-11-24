import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'MyFilm API',
      timestamp: new Date().toISOString(),
    };
  }
}
