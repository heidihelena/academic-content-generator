import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Comment } from '../domain/academic';
import { ContentService } from '../content/content.service';
import { COMMENTS_REPOSITORY, CommentsRepository } from './comments.repository';

/**
 * Notes/comments on a content item — the collaboration thread. Reads and writes
 * are scoped to the item's owner (via {@link ContentService.getItem}): you can
 * only see/comment on items you can access. The author is the request identity.
 */
@Injectable()
export class CommentsService {
  constructor(
    @Inject(COMMENTS_REPOSITORY) private readonly repo: CommentsRepository,
    private readonly content: ContentService,
  ) {}

  async listForItem(itemId: string, scope?: string): Promise<Comment[]> {
    await this.content.getItem(itemId, scope); // 404 if missing or not owned
    return this.repo.listByItem(itemId);
  }

  async add(
    itemId: string,
    body: string,
    author?: string,
    now: Date = new Date(),
  ): Promise<Comment> {
    await this.content.getItem(itemId, author); // 404 if missing or not owned
    if (!body?.trim()) throw new BadRequestException('comment body is required');
    return this.repo.upsert({
      id: `cm_${randomUUID()}`,
      itemId,
      author,
      body: body.trim(),
      createdAt: now.toISOString(),
    });
  }
}
