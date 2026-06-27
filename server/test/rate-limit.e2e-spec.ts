import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// Enable rate limiting with a tiny limit BEFORE AppModule is imported.
process.env.PERSISTENCE_DRIVER = 'memory';
process.env.VAULT_WATCH = 'false';
process.env.RATE_LIMIT_ENABLED = 'true';
process.env.RATE_LIMIT_PER_MIN = '2';
const UPLOADS_DIR = mkdtempSync(join(tmpdir(), 'cc-rl-uploads-'));
process.env.UPLOADS_DIR = UPLOADS_DIR;

import { AppModule } from '../src/app.module';

const idea = { niche: 'urban heat', audience: 'planners', tone: 'professional', platform: 'linkedin' };

describe('Rate limiting (e2e, RATE_LIMIT_ENABLED=true, 2/min)', () => {
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
    delete process.env.RATE_LIMIT_ENABLED;
    delete process.env.RATE_LIMIT_PER_MIN;
  });

  it('allows up to the limit then returns 429 on a rate-limited route', async () => {
    await request(http).post('/api/ai/ideas').send(idea).expect(201);
    await request(http).post('/api/ai/ideas').send(idea).expect(201);
    await request(http).post('/api/ai/ideas').send(idea).expect(429);
  });

  it('does not rate-limit unmarked routes', async () => {
    // The accounts route carries no @RateLimited(); many calls stay 200.
    for (let i = 0; i < 5; i++) await request(http).get('/api/accounts').expect(200);
  });
});
