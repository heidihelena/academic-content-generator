import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { mkdirSync } from 'fs';
import { isAbsolute, resolve } from 'path';
import { AppModule } from './app.module';

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
}

void bootstrap();
