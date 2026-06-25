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
const UPLOADS_DIR = mkdtempSync(join(tmpdir(), 'cc-auth-uploads-'));
process.env.UPLOADS_DIR = UPLOADS_DIR;

// eslint-disable-next-line @typescript-eslint/no-var-requires
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
  });

  it('leaves the health probe public', async () => {
    await request(http).get('/api/health').expect(200);
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
});
