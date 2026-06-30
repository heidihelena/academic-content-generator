import { Controller, Get } from '@nestjs/common';
import { ConnectionsReport, ConnectionsService } from './connections.service';

/** Status feed for the in-app Connections panel. */
@Controller('connections')
export class ConnectionsController {
  constructor(private readonly connections: ConnectionsService) {}

  /** GET /api/connections — secret-safe snapshot of providers, social and inputs. */
  @Get()
  report(): Promise<ConnectionsReport> {
    return this.connections.report();
  }
}
