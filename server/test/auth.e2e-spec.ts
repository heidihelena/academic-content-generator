import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// Enable auth BEFORE AppModule is imported (config is read at registration).
process.env.PERSISTENCE_DRIVER = 'memory';
process.env.VAULT_WATCH = 'false';
process.env.AUTH_ENABLED = 'true';
process.env.AUTH_TOKEN = 'test-token';
// Per-user tokens (multi-user) — each resolves to its own owner id.
process.env.AUTH_TOKENS = 'alice:alice-token,bob:bob-token';
const UPLOADS_DIR = mkdtempSync(join(tmpdir(), 'cc-auth-uploads-'));
process.env.UPLOADS_DIR = UPLOADS_DIR;

import { AppModule } from '../src/app.module';

describe('Auth (e2e, AUTH_ENABLED=true)', () => {
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
    delete process.env.AUTH_ENABLED;
    delete process.env.AUTH_TOKEN;
    delete process.env.AUTH_TOKENS;
  });

  it('leaves the health probe public', async () => {
    await request(http).get('/api/health').expect(200);
  });

  it('resolves /api/me to the token owner with authEnabled=true', async () => {
    const res = await request(http)
      .get('/api/me')
      .set('Authorization', 'Bearer alice-token')
      .expect(200);
    expect(res.body).toEqual({ userId: 'alice', authEnabled: true });
    // …and 401 without a token (it's behind the guard).
    await request(http).get('/api/me').expect(401);
  });

  it('rejects a protected route without a token', async () => {
    await request(http).get('/api/accounts').expect(401);
  });

  it('rejects a wrong token', async () => {
    await request(http).get('/api/accounts').set('Authorization', 'Bearer wrong').expect(401);
  });

  it('allows a protected route with the correct bearer token', async () => {
    const res = await request(http)
      .get('/api/accounts')
      .set('Authorization', 'Bearer test-token')
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('scopes content per user (multi-user tokens)', async () => {
    const idea = {
      title: 'Alice idea',
      audience: 'peers',
      pillar: 'research-finding',
      evidenceLevel: 'observational',
      claimRisk: 'low',
    };
    // Alice creates an item with her token.
    const created = await request(http)
      .post('/api/content-items')
      .set('Authorization', 'Bearer alice-token')
      .send(idea)
      .expect(201);
    const id = created.body.id;
    expect(created.body.ownerId).toBe('alice');

    // Alice sees it; Bob does not.
    const aliceList = await request(http)
      .get('/api/content-items')
      .set('Authorization', 'Bearer alice-token')
      .expect(200);
    expect(aliceList.body.map((i: { id: string }) => i.id)).toContain(id);

    const bobList = await request(http)
      .get('/api/content-items')
      .set('Authorization', 'Bearer bob-token')
      .expect(200);
    expect(bobList.body.map((i: { id: string }) => i.id)).not.toContain(id);

    // Bob can't fetch Alice's item by id — 404, not 403.
    await request(http)
      .get(`/api/content-items/${id}`)
      .set('Authorization', 'Bearer bob-token')
      .expect(404);
    await request(http)
      .get(`/api/content-items/${id}`)
      .set('Authorization', 'Bearer alice-token')
      .expect(200);

    // …and the variant under it is scoped the same way (by parent-item owner).
    const variant = await request(http)
      .post(`/api/content-items/${id}/variants`)
      .set('Authorization', 'Bearer alice-token')
      .send({ channel: 'linkedin', format: 'post', body: 'Hi' })
      .expect(201);
    const vid = variant.body.id;
    await request(http)
      .get(`/api/content-variants/${vid}`)
      .set('Authorization', 'Bearer bob-token')
      .expect(404);
    await request(http)
      .patch(`/api/content-variants/${vid}`)
      .set('Authorization', 'Bearer bob-token')
      .send({ body: 'hijack' })
      .expect(404);
    await request(http)
      .get(`/api/content-variants/${vid}`)
      .set('Authorization', 'Bearer alice-token')
      .expect(200);

    // The variant's status-history is scoped the same way.
    await request(http)
      .get(`/api/content-variants/${vid}/status-history`)
      .set('Authorization', 'Bearer bob-token')
      .expect(404);
    await request(http)
      .get(`/api/content-variants/${vid}/status-history`)
      .set('Authorization', 'Bearer alice-token')
      .expect(200);
  });
});
