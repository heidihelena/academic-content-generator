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
import { MediaModule } from './media/media.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ScheduleModule.forRoot(),
    // Global modules: pick the persistence driver, integrations and embeddings.
    PersistenceModule.forRoot(),
    IntegrationsModule,
    EmbeddingsModule,
    // Feature modules.
    PostsModule,
    AccountsModule,
    SchedulerModule,
    VaultModule,
    AiModule,
    MediaModule,
  ],
})
export class AppModule {}
