import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { mkdirSync } from 'fs';
import { createServer } from 'https';
import { isAbsolute, resolve } from 'path';
import { AppModule } from './app.module';
import { ensureSelfSignedCert } from './tls/self-signed';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors(); // allow the content-calendar frontend to call this API
  app.setGlobalPrefix('api');

  const config = app.get(ConfigService);

  // Serve locally-stored uploads at /uploads (outside the /api prefix). The
  // local-disk storage driver returns URLs pointing here.
  if (config.get<string>('storage.driver') === 'local') {
    const dir = config.get<string>('storage.uploadsDir')!;
    const abs = isAbsolute(dir) ? dir : resolve(process.cwd(), dir);
    mkdirSync(abs, { recursive: true });
    app.useStaticAssets(abs, { prefix: '/uploads/' });
  }

  const port = config.get<number>('port')!;
  await app.listen(port);
  Logger.log(`vahtian content-calendar API listening on http://localhost:${port}/api`, 'Bootstrap');

  // Second, HTTPS listener (self-signed, loopback) sharing the same routes —
  // only for OAuth callbacks from providers that refuse plain-http redirects
  // (Instagram/Threads). The browser warns once about the certificate; the
  // flow never leaves this machine.
  const httpsPort = config.get<number>('oauthHttpsPort');
  if (httpsPort) {
    const tls = await ensureSelfSignedCert();
    createServer(tls, app.getHttpAdapter().getInstance()).listen(httpsPort, '127.0.0.1');
    Logger.log(
      `OAuth HTTPS callback listener on https://127.0.0.1:${httpsPort}/api/accounts/oauth/callback (self-signed)`,
      'Bootstrap',
    );
  }

  const authOn = config.get<boolean>('auth.enabled') && Boolean(config.get<string>('auth.token'));
  Logger.log(
    authOn ? 'Auth: ENABLED (bearer token required)' : 'Auth: open (local-first default)',
    'Bootstrap',
  );
}

void bootstrap();
