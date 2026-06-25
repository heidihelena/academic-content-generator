import { Controller, Get } from '@nestjs/common';
import { HealthReport, HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /** GET /api/health — liveness/readiness probe (Docker, load balancers, the
   *  dashboard's connectivity check). Returns 200 with the active backend modes. */
  @Get()
  check(): HealthReport {
    return this.health.check();
  }
}
