import { Module } from '@nestjs/common';
import { PostsModule } from '../posts/posts.module';
import { PublisherService } from './publisher.service';

@Module({
  imports: [PostsModule],
  providers: [PublisherService],
})
export class SchedulerModule {}
