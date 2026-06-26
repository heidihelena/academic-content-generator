import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { RateLimitGuard } from './rate-limit.guard';

/**
 * Registers the config-gated per-user {@link RateLimitGuard} globally. It only
 * acts on `@RateLimited()` routes and only when RATE_LIMIT_ENABLED=true, so the
 * local-first default is unchanged. Imported after AuthModule so the auth guard
 * has already set `req.user`.
 */
@Module({
  imports: [ConfigModule],
  providers: [{ provide: APP_GUARD, useClass: RateLimitGuard }],
})
export class RateLimitModule {}
