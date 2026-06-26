import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ContentItem, ContentVariant } from '../domain/academic';
import { createDurableStore } from '../persistence/durable-store';
import { SafetyModule } from '../safety/safety.module';
import { TimingModule } from '../timing/timing.module';
import { StatusHistoryModule } from '../status-history/status-history.module';
import { CalendarController } from './calendar.controller';
import { ContentReviewService } from './content-review.service';
import { ContentItemsController, ContentVariantsController } from './content.controller';
import {
  CONTENT_ITEMS_REPOSITORY,
  CONTENT_VARIANTS_REPOSITORY,
  InMemoryContentItemsRepository,
  InMemoryContentVariantsRepository,
  StoreBackedContentItemsRepository,
  StoreBackedContentVariantsRepository,
  type ContentItemsRepository,
  type ContentVariantsRepository,
} from './content.repository';
import { ContentService } from './content.service';

/** ContentItem + ContentVariant model (one idea → many channel/format variants). */
@Module({
  imports: [ConfigModule, SafetyModule, TimingModule, forwardRef(() => StatusHistoryModule)],
  providers: [
    ContentService,
    ContentReviewService,
    {
      provide: CONTENT_ITEMS_REPOSITORY,
      inject: [ConfigService],
      useFactory: (config: ConfigService): ContentItemsRepository => {
        const driver = config.get<string>('persistence.driver') ?? 'memory';
        if (driver === 'memory') return new InMemoryContentItemsRepository();
        return new StoreBackedContentItemsRepository(
          createDurableStore<ContentItem>({
            driver,
            filePath: process.env.CONTENT_ITEMS_STORE_PATH ?? './data/content-items.json',
            sqlitePath: config.get<string>('persistence.sqlitePath')!,
            table: 'content_items',
          }),
        );
      },
    },
    {
      provide: CONTENT_VARIANTS_REPOSITORY,
      inject: [ConfigService],
      useFactory: (config: ConfigService): ContentVariantsRepository => {
        const driver = config.get<string>('persistence.driver') ?? 'memory';
        if (driver === 'memory') return new InMemoryContentVariantsRepository();
        return new StoreBackedContentVariantsRepository(
          createDurableStore<ContentVariant>({
            driver,
            filePath: process.env.CONTENT_VARIANTS_STORE_PATH ?? './data/content-variants.json',
            sqlitePath: config.get<string>('persistence.sqlitePath')!,
            table: 'content_variants',
          }),
        );
      },
    },
  ],
  controllers: [ContentItemsController, ContentVariantsController, CalendarController],
  exports: [ContentService, ContentReviewService],
})
export class ContentModule {}
