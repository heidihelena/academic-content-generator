import { Module } from '@nestjs/common';
import { VaultService } from './vault.service';
import { VaultController } from './vault.controller';
import { VaultWatcherService } from './vault-watcher.service';

@Module({
  providers: [VaultService, VaultWatcherService],
  controllers: [VaultController],
  exports: [VaultService],
})
export class VaultModule {}
