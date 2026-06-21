import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  POSTS_REPOSITORY,
  type PostsRepository,
} from '../persistence/repository.interfaces';
import { PostsService } from '../posts/posts.service';

/**
 * The scheduler worker. Every minute it finds scheduled posts whose time has
 * arrived and publishes them via the integration layer. This is what turns
 * `status: 'scheduled'` from a label into a real action.
 *
 * For multi-instance deployments, guard each publish with a row lock / advisory
 * lock (Postgres) or a leased-job table so two workers don't double-publish.
 */
@Injectable()
export class PublisherService {
  private readonly logger = new Logger(PublisherService.name);
  private running = false;

  constructor(
    @Inject(POSTS_REPOSITORY) private readonly posts: PostsRepository,
    private readonly postsService: PostsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async publishDuePosts(): Promise<void> {
    if (this.running) return; // avoid overlapping runs
    this.running = true;
    try {
      const due = await this.posts.findDue(new Date().toISOString());
      if (due.length === 0) return;
      this.logger.log(`Publishing ${due.length} due post(s)`);
      for (const post of due) {
        await this.postsService.publish(post.id);
      }
    } catch (err) {
      this.logger.error(`Scheduler run failed: ${err instanceof Error ? err.message : err}`);
    } finally {
      this.running = false;
    }
  }
}
