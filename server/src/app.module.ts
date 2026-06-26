import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { PersistenceModule } from './persistence/persistence.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { EmbeddingsModule } from './embeddings/embeddings.module';
import { PostsModule } from './posts/posts.module';
import { AccountsModule } from './accounts/accounts.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { VaultModule } from './vault/vault.module';
import { AiModule } from './ai/ai.module';
import { SafetyModule } from './safety/safety.module';
import { SourcesModule } from './sources/sources.module';
import { IdeaLabModule } from './idea-lab/idea-lab.module';
import { DraftStudioModule } from './draft-studio/draft-studio.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { CarouselModule } from './carousel/carousel.module';
import { ContentPlanModule } from './content-plan/content-plan.module';
import { ContentModule } from './content/content.module';
import { ReuseModule } from './reuse/reuse.module';
import { TimingModule } from './timing/timing.module';
import { EngagementModule } from './engagement/engagement.module';
import { VaultExportModule } from './vault-export/vault-export.module';
import { TalkPackageModule } from './talk-package/talk-package.module';
import { MediaModule } from './media/media.module';
import { RenderModule } from './render/render.module';
import { ShortsModule } from './shorts/shorts.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { PublishLogModule } from './publish-log/publish-log.module';
import { InsightsModule } from './insights/insights.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ScheduleModule.forRoot(),
    // Global modules: pick the persistence driver, integrations and embeddings.
    PersistenceModule.forRoot(),
    IntegrationsModule,
    EmbeddingsModule,
    // Global config-gated auth guard (no-op unless AUTH_ENABLED=true).
    AuthModule,
    // Feature modules.
    HealthModule,
    PostsModule,
    AccountsModule,
    SchedulerModule,
    VaultModule,
    AiModule,
    SafetyModule,
    SourcesModule,
    IdeaLabModule,
    DraftStudioModule,
    CampaignsModule,
    ContentPlanModule,
    ContentModule,
    PublishLogModule,
    InsightsModule,
    ReuseModule,
    TimingModule,
    EngagementModule,
    VaultExportModule,
    CarouselModule,
    TalkPackageModule,
    MediaModule,
    RenderModule,
    ShortsModule,
  ],
})
export class AppModule {}
