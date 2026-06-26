import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ContentModule } from '../content/content.module';
import { createDurableStore } from '../persistence/durable-store';
import { Comment } from '../domain/academic';
import { CommentsController } from './comments.controller';
import {
  COMMENTS_REPOSITORY,
  InMemoryCommentsRepository,
  StoreBackedCommentsRepository,
  type CommentsRepository,
} from './comments.repository';
import { CommentsService } from './comments.service';

/** Notes/comments on content items (collaboration thread). */
@Module({
  imports: [ConfigModule, ContentModule],
  providers: [
    CommentsService,
    {
      provide: COMMENTS_REPOSITORY,
      inject: [ConfigService],
      useFactory: (config: ConfigService): CommentsRepository => {
        const driver = config.get<string>('persistence.driver') ?? 'memory';
        if (driver === 'memory') return new InMemoryCommentsRepository();
        return new StoreBackedCommentsRepository(
          createDurableStore<Comment>({
            driver,
            filePath: process.env.COMMENTS_STORE_PATH ?? './data/comments.json',
            sqlitePath: config.get<string>('persistence.sqlitePath')!,
            table: 'comments',
          }),
        );
      },
    },
  ],
  controllers: [CommentsController],
  exports: [CommentsService],
})
export class CommentsModule {}
