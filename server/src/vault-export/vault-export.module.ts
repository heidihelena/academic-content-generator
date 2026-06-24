import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OutputsModule } from '../outputs/outputs.module';
import { SourcesModule } from '../sources/sources.module';
import { VaultExportController } from './vault-export.controller';
import { VaultExportService } from './vault-export.service';

/** One-way export of stored outputs to the Obsidian vault (markdown projection). */
@Module({
  imports: [ConfigModule, OutputsModule, SourcesModule],
  providers: [VaultExportService],
  controllers: [VaultExportController],
  exports: [VaultExportService],
})
export class VaultExportModule {}
