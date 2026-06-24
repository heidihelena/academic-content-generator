import { Module } from '@nestjs/common';
import { CampaignsController } from './campaigns.controller';
import { CAMPAIGNS_REPOSITORY, InMemoryCampaignsRepository } from './campaigns.repository';
import { CampaignsService } from './campaigns.service';

/** Campaign planner (ForskAI, issue #36). */
@Module({
  providers: [
    CampaignsService,
    { provide: CAMPAIGNS_REPOSITORY, useClass: InMemoryCampaignsRepository },
  ],
  controllers: [CampaignsController],
  exports: [CampaignsService],
})
export class CampaignsModule {}
