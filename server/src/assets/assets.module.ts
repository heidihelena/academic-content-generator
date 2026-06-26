import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ContentModule } from '../content/content.module';
import { createDurableStore } from '../persistence/durable-store';
import { Asset } from '../domain/academic';
import { AssetsController } from './assets.controller';
import {
  ASSETS_REPOSITORY,
  InMemoryAssetsRepository,
  StoreBackedAssetsRepository,
  type AssetsRepository,
} from './assets.repository';
import { AssetsService } from './assets.service';

/** Media attachments on content items (image/video references). */
@Module({
  imports: [ConfigModule, ContentModule],
  providers: [
    AssetsService,
    {
      provide: ASSETS_REPOSITORY,
      inject: [ConfigService],
      useFactory: (config: ConfigService): AssetsRepository => {
        const driver = config.get<string>('persistence.driver') ?? 'memory';
        if (driver === 'memory') return new InMemoryAssetsRepository();
        return new StoreBackedAssetsRepository(
          createDurableStore<Asset>({
            driver,
            filePath: process.env.ASSETS_STORE_PATH ?? './data/assets.json',
            sqlitePath: config.get<string>('persistence.sqlitePath')!,
            table: 'assets',
          }),
        );
      },
    },
  ],
  controllers: [AssetsController],
  exports: [AssetsService],
})
export class AssetsModule {}
