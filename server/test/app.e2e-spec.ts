import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// Force the dependency-free in-memory driver before AppModule is imported
// (PersistenceModule.forRoot reads this at registration time).
process.env.PERSISTENCE_DRIVER = 'memory';
process.env.VAULT_WATCH = 'false';
// Write uploads to a throwaway temp dir so tests don't litter the repo.
const UPLOADS_DIR = mkdtempSync(join(tmpdir(), 'cc-uploads-'));
process.env.UPLOADS_DIR = UPLOADS_DIR;

// eslint-disable-next-line @typescript-eslint/no-var-requires
import { AppModule } from '../src/app.module';

describe('Content Calendar API (e2e, memory driver)', () => {
  let app: INestApplication;
  let http: ReturnType<INestApplication['getHttpServer']>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    http = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
    rmSync(UPLOADS_DIR, { recursive: true, force: true });
  });

  it('seeds three disconnected accounts', async () => {
    const res = await request(http).get('/api/accounts').expect(200);
    expect(res.body).toHaveLength(3);
    expect(res.body.every((a: any) => a.status === 'disconnected')).toBe(true);
  });

  it('supports the post CRUD lifecycle', async () => {
    const created = await request(http)
      .post('/api/posts')
      .send({ platform: 'threads', body: 'draft post', scheduledAt: '2030-01-01T09:00:00.000Z' })
      .expect(201);
    const id = created.body.id;
    expect(created.body.status).toBe('draft');

    await request(http).get(`/api/posts/${id}`).expect(200);

    const updated = await request(http).patch(`/api/posts/${id}`).send({ body: 'edited' }).expect(200);
    expect(updated.body.body).toBe('edited');

    const list = await request(http).get('/api/posts').expect(200);
    expect(list.body.some((p: any) => p.id === id)).toBe(true);

    await request(http).delete(`/api/posts/${id}`).expect(200);
    await request(http).get(`/api/posts/${id}`).expect(404);
  });

  it('completes the OAuth authorize → callback loop and then publishes', async () => {
    const authorize = await request(http)
      .get('/api/accounts/oauth/instagram/authorize')
      .expect(200);
    const url = new URL(authorize.body.authorizeUrl);
    const code = url.searchParams.get('code')!;
    const state = url.searchParams.get('state')!;
    expect(code).toBeTruthy();

    const callback = await request(http)
      .get(`/api/accounts/oauth/callback?code=${code}&state=${state}`)
      .expect(200);
    expect(callback.body.status).toBe('connected');
    expect(callback.body.platform).toBe('instagram');

    // The account is now connected, so publishing succeeds.
    const post = await request(http)
      .post('/api/posts')
      .send({ platform: 'instagram', body: 'ship it', scheduledAt: '2030-01-01T09:00:00.000Z' })
      .expect(201);
    const published = await request(http).post(`/api/posts/${post.body.id}/publish`).expect(201);
    expect(published.body.status).toBe('published');
    expect(published.body.remoteId).toBeTruthy();
  });

  it('rejects an OAuth callback with bad state', async () => {
    await request(http).get('/api/accounts/oauth/callback?code=x&state=bogus').expect(400);
  });

  it('handles vault ingest and search with no vault present', async () => {
    process.env.VAULT_PATH = './does-not-exist';
    const ingest = await request(http).post('/api/vault/ingest').expect(201);
    expect(ingest.body.files).toBe(0);
    const search = await request(http).get('/api/vault/search?q=anything').expect(200);
    expect(search.body).toEqual([]);
  });

  it('uploads media and returns a public URL', async () => {
    const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex'); // PNG header bytes
    const res = await request(http)
      .post('/api/media/upload')
      .attach('file', png, { filename: 'pic.png', contentType: 'image/png' })
      .expect(201);
    expect(res.body.type).toBe('image');
    expect(res.body.label).toBe('pic.png');
    expect(res.body.url).toContain('/uploads/');
  });

  it('rejects unsupported media types', async () => {
    await request(http)
      .post('/api/media/upload')
      .attach('file', Buffer.from('hello'), { filename: 'x.txt', contentType: 'text/plain' })
      .expect(400);
  });

  it('generates 5 AI ideas and validates input', async () => {
    const ok = await request(http)
      .post('/api/ai/ideas')
      .send({ niche: 'coffee', audience: 'baristas', tone: 'witty', platform: 'instagram' })
      .expect(201);
    expect(ok.body.ideas).toHaveLength(5);
    expect(ok.body.source).toBe('mock-generator-v1');

    await request(http)
      .post('/api/ai/ideas')
      .send({ niche: '', audience: 'baristas', tone: 'witty', platform: 'instagram' })
      .expect(400);
  });
});
