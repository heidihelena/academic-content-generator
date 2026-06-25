import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { HealthReport, HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /** GET /api/health — liveness/readiness probe (Docker, load balancers, the
   *  dashboard's connectivity check). Public so probes work even with auth on. */
  @Public()
  @Get()
  check(): HealthReport {
    return this.health.check();
  }
}
