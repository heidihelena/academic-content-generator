import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CurrentUserId } from './current-user.decorator';

export interface MeResponse {
  /** The resolved request identity (`'local'` in the open single-user default). */
  userId: string;
  /** Whether bearer auth is actually enforced (enabled AND a token is configured). */
  authEnabled: boolean;
}

/** Who am I — the authenticated identity for the current request. */
@Controller('me')
export class IdentityController {
  constructor(private readonly config: ConfigService) {}

  /** GET /api/me — the current user id and whether auth is enforced. */
  @Get()
  me(@CurrentUserId() userId: string): MeResponse {
    const enabled = this.config.get<boolean>('auth.enabled') ?? false;
    const hasToken =
      Boolean(this.config.get<string>('auth.token')) ||
      Object.keys(this.config.get<Record<string, string>>('auth.tokens') ?? {}).length > 0;
    return { userId, authEnabled: enabled && hasToken };
  }
}
