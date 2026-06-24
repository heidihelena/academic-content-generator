import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ContentModule } from '../content/content.module';
import { SourcesModule } from '../sources/sources.module';
import { VaultExportController } from './vault-export.controller';
import { VaultExportService } from './vault-export.service';

/** One-way export of content to the Obsidian vault (markdown map-of-content). */
@Module({
  imports: [ConfigModule, SourcesModule, ContentModule],
  providers: [VaultExportService],
  controllers: [VaultExportController],
  exports: [VaultExportService],
})
export class VaultExportModule {}
