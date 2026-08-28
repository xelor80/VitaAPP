import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';

@Controller('health')
export class HealthCheckController {
  /** Liveness-Probe (kein Auth). GET /api/v1/health */
  @Public()
  @Get()
  check(): { status: string; time: string } {
    return { status: 'ok', time: new Date().toISOString() };
  }
}
