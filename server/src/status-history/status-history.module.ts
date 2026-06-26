import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createDurableStore } from '../persistence/durable-store';
import { StatusChange } from '../domain/academic';
import { StatusHistoryController } from './status-history.controller';
import {
  InMemoryStatusHistoryRepository,
  STATUS_HISTORY_REPOSITORY,
  StoreBackedStatusHistoryRepository,
  type StatusHistoryRepository,
} from './status-history.repository';
import { StatusHistoryService } from './status-history.service';

/** Variant approval-workflow audit trail (StatusChange log). */
@Module({
  imports: [ConfigModule],
  providers: [
    StatusHistoryService,
    {
      provide: STATUS_HISTORY_REPOSITORY,
      inject: [ConfigService],
      useFactory: (config: ConfigService): StatusHistoryRepository => {
        const driver = config.get<string>('persistence.driver') ?? 'memory';
        if (driver === 'memory') return new InMemoryStatusHistoryRepository();
        return new StoreBackedStatusHistoryRepository(
          createDurableStore<StatusChange>({
            driver,
            filePath: process.env.STATUS_HISTORY_STORE_PATH ?? './data/status-history.json',
            sqlitePath: config.get<string>('persistence.sqlitePath')!,
            table: 'status_history',
          }),
        );
      },
    },
  ],
  controllers: [StatusHistoryController],
  exports: [StatusHistoryService],
})
export class StatusHistoryModule {}
