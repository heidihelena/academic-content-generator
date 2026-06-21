import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MediaController } from './media.controller';
import { STORAGE_SERVICE, type StorageService } from './storage.types';
import { LocalDiskStorage } from './local-disk.storage';
import { S3Storage } from './s3.storage';

@Module({
  imports: [ConfigModule],
  controllers: [MediaController],
  providers: [
    {
      provide: STORAGE_SERVICE,
      inject: [ConfigService],
      useFactory: (config: ConfigService): StorageService =>
        config.get<string>('storage.driver') === 's3'
          ? new S3Storage(config)
          : new LocalDiskStorage(config),
    },
  ],
})
export class MediaModule {}
