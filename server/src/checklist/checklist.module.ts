import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ContentModule } from '../content/content.module';
import { createDurableStore } from '../persistence/durable-store';
import { ChecklistItem } from '../domain/academic';
import { ChecklistController } from './checklist.controller';
import {
  CHECKLIST_REPOSITORY,
  InMemoryChecklistRepository,
  StoreBackedChecklistRepository,
  type ChecklistRepository,
} from './checklist.repository';
import { ChecklistService } from './checklist.service';

/** Pre-publish checklist on content items (editorial QA gate). */
@Module({
  imports: [ConfigModule, ContentModule],
  providers: [
    ChecklistService,
    {
      provide: CHECKLIST_REPOSITORY,
      inject: [ConfigService],
      useFactory: (config: ConfigService): ChecklistRepository => {
        const driver = config.get<string>('persistence.driver') ?? 'memory';
        if (driver === 'memory') return new InMemoryChecklistRepository();
        return new StoreBackedChecklistRepository(
          createDurableStore<ChecklistItem>({
            driver,
            filePath: process.env.CHECKLIST_STORE_PATH ?? './data/checklist.json',
            sqlitePath: config.get<string>('persistence.sqlitePath')!,
            table: 'checklist',
          }),
        );
      },
    },
  ],
  controllers: [ChecklistController],
  exports: [ChecklistService],
})
export class ChecklistModule {}
