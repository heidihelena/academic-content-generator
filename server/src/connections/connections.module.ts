import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConnectionsController } from './connections.controller';
import { ConnectionsService } from './connections.service';

/** Secret-safe connection status for the in-app Connections panel. */
@Module({
  imports: [ConfigModule],
  controllers: [ConnectionsController],
  providers: [ConnectionsService],
})
export class ConnectionsModule {}
