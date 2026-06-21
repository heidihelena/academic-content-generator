import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // allow the content-calendar frontend to call this API
  app.setGlobalPrefix('api');

  const config = app.get(ConfigService);
  const port = config.get<number>('port')!;
  await app.listen(port);
  Logger.log(`vahtian content-calendar API listening on http://localhost:${port}/api`, 'Bootstrap');
}

void bootstrap();
