import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Post } from '../domain/types';
import {
  POSTS_REPOSITORY,
  TOKEN_STORE,
  type PostsRepository,
  type TokenStore,
} from '../persistence/repository.interfaces';
import { IntegrationRegistry } from '../integrations/integration.registry';
import type { ReplyRef } from '../integrations/integration.types';
import type { CreatePostDto, UpdatePostDto } from './dto/post.dto';

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(
    @Inject(POSTS_REPOSITORY) private readonly posts: PostsRepository,
    @Inject(TOKEN_STORE) private readonly tokens: TokenStore,
    private readonly integrations: IntegrationRegistry,
  ) {}

  list(): Promise<Post[]> {
    return this.posts.list();
  }

  async get(id: string): Promise<Post> {
    const post = await this.posts.findById(id);
    if (!post) throw new NotFoundException(`Post ${id} not found`);
    return post;
  }

  create(dto: CreatePostDto): Promise<Post> {
    const now = new Date().toISOString();
    const post: Post = {
      id: dto.id ?? `post_${randomUUID()}`,
      platform: dto.platform,
      body: dto.body,
      scheduledAt: dto.scheduledAt,
      status: dto.status ?? 'draft',
      media: dto.media ?? [],
      owner: dto.owner,
      campaign: dto.campaign,
      brief: dto.brief,
      audience: dto.audience,
      theme: dto.theme,
      hook: dto.hook,
      source: dto.source,
      evidenceLevel: dto.evidenceLevel,
      reviewer: dto.reviewer,
      reviews: dto.reviews,
      threadId: dto.threadId,
      threadIndex: dto.threadIndex,
      createdAt: now,
      updatedAt: now,
    };
    return this.posts.upsert(post);
  }

  async update(id: string, dto: UpdatePostDto): Promise<Post> {
    const existing = await this.get(id);
    const updated: Post = {
      ...existing,
      ...dto,
      media: dto.media ?? existing.media,
      updatedAt: new Date().toISOString(),
    };
    return this.posts.upsert(updated);
  }

  async remove(id: string): Promise<void> {
    await this.get(id);
    await this.posts.delete(id);
  }

  /**
   * Publishes a post immediately via its platform integration, then records the
   * remote id / permalink (or the failure). Shared by the manual "publish now"
   * endpoint and the scheduler.
   */
  async publish(id: string): Promise<Post> {
    const post = await this.get(id);
    const token = await this.tokens.get(post.platform);
    if (!token) {
      return this.markFailed(post, `No connected ${post.platform} account`);
    }
    try {
      const reply = await this.resolveReply(post);
      const result = await this.integrations
        .get(post.platform)
        .publish(post, token, reply ? { reply } : undefined);
      return this.posts.upsert({
        ...post,
        status: 'published',
        remoteId: result.remoteId,
        permalink: result.permalink,
        remoteCid: result.remoteCid,
        failureReason: undefined,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Publish failed';
      this.logger.error(`Publish failed for ${id}: ${reason}`);
      return this.markFailed(post, reason);
    }
  }

  /**
   * For a thread part (threadIndex > 0), resolve refs to the thread root and the
   * immediate parent so the integration can chain the reply. Returns undefined
   * when this isn't a thread part or the predecessors aren't published yet —
   * in which case the part posts standalone rather than failing.
   */
  private async resolveReply(post: Post): Promise<ReplyRef | undefined> {
    const index = post.threadIndex ?? 0;
    if (!post.threadId || index === 0) return undefined;
    const siblings = (await this.posts.list()).filter((p) => p.threadId === post.threadId);
    const root = siblings.find((p) => (p.threadIndex ?? 0) === 0);
    const parent = siblings.find((p) => (p.threadIndex ?? 0) === index - 1);
    if (!root?.remoteId || !parent?.remoteId) return undefined;
    return {
      root: { uri: root.remoteId, cid: root.remoteCid },
      parent: { uri: parent.remoteId, cid: parent.remoteCid },
    };
  }

  private markFailed(post: Post, reason: string): Promise<Post> {
    return this.posts.upsert({
      ...post,
      status: 'failed',
      failureReason: reason,
      updatedAt: new Date().toISOString(),
    });
  }
}
