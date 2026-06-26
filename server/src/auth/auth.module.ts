import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import { IdentityController } from './identity.controller';

/**
 * Registers the config-gated {@link AuthGuard} globally. A no-op unless
 * AUTH_ENABLED=true + AUTH_TOKEN are set, so the local-first default is
 * unchanged. Global by registration so every controller is protected by
 * default (opt out per route with `@Public()`). Also exposes GET /api/me.
 */
@Module({
  imports: [ConfigModule],
  controllers: [IdentityController],
  providers: [{ provide: APP_GUARD, useClass: AuthGuard }],
})
export class AuthModule {}
