import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ContentModule } from '../content/content.module';
import { createDurableStore } from '../persistence/durable-store';
import { PublishLog } from '../domain/academic';
import { PublishLogController } from './publish-log.controller';
import {
  InMemoryPublishLogRepository,
  PUBLISH_LOG_REPOSITORY,
  StoreBackedPublishLogRepository,
  type PublishLogRepository,
} from './publish-log.repository';
import { PublishLogService } from './publish-log.service';

/** Manual-publish assistant: records where/when a variant went live (PublishLog). */
@Module({
  imports: [ConfigModule, ContentModule],
  providers: [
    PublishLogService,
    {
      provide: PUBLISH_LOG_REPOSITORY,
      inject: [ConfigService],
      useFactory: (config: ConfigService): PublishLogRepository => {
        const driver = config.get<string>('persistence.driver') ?? 'memory';
        if (driver === 'memory') return new InMemoryPublishLogRepository();
        return new StoreBackedPublishLogRepository(
          createDurableStore<PublishLog>({
            driver,
            filePath: process.env.PUBLISH_LOG_STORE_PATH ?? './data/publish-log.json',
            sqlitePath: config.get<string>('persistence.sqlitePath')!,
            table: 'publish_log',
          }),
        );
      },
    },
  ],
  controllers: [PublishLogController],
  exports: [PublishLogService],
})
export class PublishLogModule {}
