import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ContentItem, ContentVariant } from '../domain/academic';
import { JsonFileStore } from '../persistence/json-file.store';
import { SafetyModule } from '../safety/safety.module';
import { CalendarController } from './calendar.controller';
import { ContentReviewService } from './content-review.service';
import { ContentItemsController, ContentVariantsController } from './content.controller';
import {
  CONTENT_ITEMS_REPOSITORY,
  CONTENT_VARIANTS_REPOSITORY,
  FileContentItemsRepository,
  FileContentVariantsRepository,
  InMemoryContentItemsRepository,
  InMemoryContentVariantsRepository,
  type ContentItemsRepository,
  type ContentVariantsRepository,
} from './content.repository';
import { ContentService } from './content.service';

/** ContentItem + ContentVariant model (one idea → many channel/format variants). */
@Module({
  imports: [ConfigModule, SafetyModule],
  providers: [
    ContentService,
    ContentReviewService,
    {
      provide: CONTENT_ITEMS_REPOSITORY,
      inject: [ConfigService],
      useFactory: (config: ConfigService): ContentItemsRepository => {
        const driver = config.get<string>('persistence.driver') ?? 'memory';
        if (driver === 'memory') return new InMemoryContentItemsRepository();
        const path = process.env.CONTENT_ITEMS_STORE_PATH ?? './data/content-items.json';
        return new FileContentItemsRepository(new JsonFileStore<ContentItem>(path));
      },
    },
    {
      provide: CONTENT_VARIANTS_REPOSITORY,
      inject: [ConfigService],
      useFactory: (config: ConfigService): ContentVariantsRepository => {
        const driver = config.get<string>('persistence.driver') ?? 'memory';
        if (driver === 'memory') return new InMemoryContentVariantsRepository();
        const path = process.env.CONTENT_VARIANTS_STORE_PATH ?? './data/content-variants.json';
        return new FileContentVariantsRepository(new JsonFileStore<ContentVariant>(path));
      },
    },
  ],
  controllers: [ContentItemsController, ContentVariantsController, CalendarController],
  exports: [ContentService, ContentReviewService],
})
export class ContentModule {}
