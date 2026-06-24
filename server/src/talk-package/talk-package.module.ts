import { Module } from '@nestjs/common';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { ContentPlanModule } from '../content-plan/content-plan.module';
import { SafetyModule } from '../safety/safety.module';
import { TalkPackageController } from './talk-package.controller';
import { TalkPackageService } from './talk-package.service';

/** Talk-package generator (source → long-form talk + derived shorts as a campaign). */
@Module({
  imports: [ContentPlanModule, CampaignsModule, SafetyModule],
  providers: [TalkPackageService],
  controllers: [TalkPackageController],
  exports: [TalkPackageService],
})
export class TalkPackageModule {}
