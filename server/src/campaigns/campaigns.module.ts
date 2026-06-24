import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JsonFileStore } from '../persistence/json-file.store';
import { Campaign } from '../domain/academic';
import { CampaignsController } from './campaigns.controller';
import {
  CAMPAIGNS_REPOSITORY,
  FileCampaignsRepository,
  InMemoryCampaignsRepository,
  type CampaignsRepository,
} from './campaigns.repository';
import { CampaignsService } from './campaigns.service';

/** Campaign planner (ForskAI, issue #36). */
@Module({
  imports: [ConfigModule],
  providers: [
    CampaignsService,
    {
      // Durable JSON file when a non-memory persistence driver is configured,
      // in-memory otherwise (the local-first default).
      provide: CAMPAIGNS_REPOSITORY,
      inject: [ConfigService],
      useFactory: (config: ConfigService): CampaignsRepository => {
        const driver = config.get<string>('persistence.driver') ?? 'memory';
        if (driver === 'memory') return new InMemoryCampaignsRepository();
        const path = process.env.CAMPAIGNS_STORE_PATH ?? './data/campaigns.json';
        return new FileCampaignsRepository(new JsonFileStore<Campaign>(path));
      },
    },
  ],
  controllers: [CampaignsController],
  exports: [CampaignsService],
})
export class CampaignsModule {}
