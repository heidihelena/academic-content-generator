import { NotFoundException } from '@nestjs/common';
import { PostsService } from './posts.service';
import { MemoryPostsRepository, MemoryTokenStore } from '../persistence/memory/memory.repositories';
import type { IntegrationRegistry } from '../integrations/integration.registry';
import type { AccessToken } from '../domain/types';

function makeService(publishImpl?: () => Promise<{ remoteId: string; permalink: string }>) {
  const posts = new MemoryPostsRepository();
  const tokens = new MemoryTokenStore();
  const integration = {
    publish: publishImpl ?? (async () => ({ remoteId: 'remote_1', permalink: 'https://x/p/1' })),
  };
  const registry = {
    get: () => integration,
    forPublish: async () => integration,
  } as unknown as IntegrationRegistry;
  return { service: new PostsService(posts, tokens, registry), tokens };
}

const token: AccessToken = {
  platform: 'instagram',
  accessToken: 'tok',
  expiresAt: Date.now() + 1e6,
  scopes: [],
};

describe('PostsService', () => {
  it('creates a draft post by default', async () => {
    const { service } = makeService();
    const post = await service.create({
      platform: 'instagram',
      body: 'hi',
      scheduledAt: '2030-01-01T00:00:00.000Z',
    });
    expect(post.id).toMatch(/^post_/);
    expect(post.status).toBe('draft');
  });

  it('updates an existing post', async () => {
    const { service } = makeService();
    const created = await service.create({ platform: 'threads', body: 'a', scheduledAt: '2030-01-01T00:00:00.000Z' });
    const updated = await service.update(created.id, { body: 'b', status: 'scheduled' });
    expect(updated.body).toBe('b');
    expect(updated.status).toBe('scheduled');
  });

  it('throws NotFound for a missing post', async () => {
    const { service } = makeService();
    await expect(service.get('nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('marks a post failed when no account is connected', async () => {
    const { service } = makeService();
    const created = await service.create({ platform: 'instagram', body: 'x', scheduledAt: '2030-01-01T00:00:00.000Z' });
    const published = await service.publish(created.id);
    expect(published.status).toBe('failed');
    expect(published.failureReason).toMatch(/No connected instagram/);
  });

  it('publishes successfully when a token is present', async () => {
    const { service, tokens } = makeService();
    await tokens.set(token);
    const created = await service.create({ platform: 'instagram', body: 'x', scheduledAt: '2030-01-01T00:00:00.000Z' });
    const published = await service.publish(created.id);
    expect(published.status).toBe('published');
    expect(published.remoteId).toBe('remote_1');
    expect(published.permalink).toBe('https://x/p/1');
  });

  it('records the failure reason when the integration throws', async () => {
    const { service, tokens } = makeService(async () => {
      throw new Error('rate limited');
    });
    await tokens.set(token);
    const created = await service.create({ platform: 'instagram', body: 'x', scheduledAt: '2030-01-01T00:00:00.000Z' });
    const published = await service.publish(created.id);
    expect(published.status).toBe('failed');
    expect(published.failureReason).toBe('rate limited');
  });

  it('chains thread replies: a later part replies to the published parent', async () => {
    const calls: Array<{ body: string; opts: any }> = [];
    let n = 0;
    const posts = new MemoryPostsRepository();
    const tokens = new MemoryTokenStore();
    const integration = {
      publish: async (p: { body: string }, _t: unknown, opts: unknown) => {
        n += 1;
        calls.push({ body: p.body, opts });
        return { remoteId: `uri${n}`, remoteCid: `cid${n}`, permalink: `https://x/${n}` };
      },
    };
    const registry = {
      get: () => integration,
      forPublish: async () => integration,
    } as unknown as IntegrationRegistry;
    const service = new PostsService(posts, tokens, registry);
    await tokens.set({ platform: 'bluesky', accessToken: 't', expiresAt: Date.now() + 1e6, scopes: [] });

    const p0 = await service.create({
      platform: 'bluesky',
      body: 'part 1',
      scheduledAt: '2030-01-01T00:00:00.000Z',
      threadId: 'th1',
      threadIndex: 0,
    });
    const p1 = await service.create({
      platform: 'bluesky',
      body: 'part 2',
      scheduledAt: '2030-01-01T00:02:00.000Z',
      threadId: 'th1',
      threadIndex: 1,
    });

    await service.publish(p0.id);
    await service.publish(p1.id);

    // The root post publishes with no reply context…
    expect(calls[0].opts).toBeUndefined();
    // …and the second part replies to the now-published first part.
    expect(calls[1].opts.reply.parent.uri).toBe('uri1');
    expect(calls[1].opts.reply.parent.cid).toBe('cid1');
    expect(calls[1].opts.reply.root.uri).toBe('uri1');
  });

  it('deletes a post', async () => {
    const { service } = makeService();
    const created = await service.create({ platform: 'threads', body: 'a', scheduledAt: '2030-01-01T00:00:00.000Z' });
    await service.remove(created.id);
    await expect(service.get(created.id)).rejects.toBeInstanceOf(NotFoundException);
  });
});
