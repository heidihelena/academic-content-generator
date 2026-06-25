import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { timingSafeEqual } from 'crypto';
import { IS_PUBLIC_KEY } from './public.decorator';

/** The identity attached to a request after the guard runs. */
export interface RequestUser {
  userId: string;
}

/** Minimal shape of the HTTP request the guard reads (avoids an @types/express
 *  dependency — only the headers and the attached identity are used). */
interface GuardRequest {
  headers: { authorization?: string };
  user?: RequestUser;
}

/**
 * Config-gated bearer-token auth (local-first).
 *
 * - `AUTH_ENABLED` unset/false → the API is open; every request is the single
 *   implicit local user (`auth.defaultUserId`). Zero-config default, no change
 *   to the offline/demo experience.
 * - `AUTH_ENABLED=true` + a token → a valid `Authorization: Bearer <token>` is
 *   required (constant-time compared); otherwise 401. The shared `AUTH_TOKEN`
 *   resolves to `defaultUserId`; per-user `AUTH_TOKENS` resolve to that user id
 *   (multi-user), scoping their content.
 * - `AUTH_ENABLED=true` but no token at all → fails *safe*: stays open with a
 *   one-time warning, so a misconfiguration can't silently lock everyone out
 *   (the same never-break philosophy as the LLM fallbacks).
 *
 * `@Public()` routes (the health probe) are always allowed. The resolved
 * identity is attached as `req.user` — what per-user data scoping
 * (ContentItem.ownerId) reads.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  private warned = false;

  constructor(
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<GuardRequest>();
    const defaultUserId = this.config.get<string>('auth.defaultUserId') ?? 'local';

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const enabled = this.config.get<boolean>('auth.enabled');
    // Candidate (userId, token) credentials: per-user tokens + the shared token.
    const credentials = this.credentials(defaultUserId);

    // Open mode: disabled, or enabled-without-any-token (fail safe).
    if (!enabled || credentials.length === 0) {
      if (enabled && credentials.length === 0 && !this.warned) {
        this.warned = true;
        this.logger.warn('AUTH_ENABLED=true but no AUTH_TOKEN/AUTH_TOKENS set — auth stays OPEN.');
      }
      req.user = { userId: defaultUserId };
      return true;
    }

    if (isPublic) {
      req.user = { userId: defaultUserId };
      return true;
    }

    const presented = this.bearer(req.headers.authorization);
    const matched = presented && credentials.find((c) => this.matches(presented, c.token));
    if (!matched) {
      throw new UnauthorizedException('A valid bearer token is required.');
    }
    req.user = { userId: matched.userId };
    return true;
  }

  private credentials(defaultUserId: string): Array<{ userId: string; token: string }> {
    const out: Array<{ userId: string; token: string }> = [];
    const tokens = this.config.get<Record<string, string>>('auth.tokens') ?? {};
    for (const [userId, token] of Object.entries(tokens)) {
      if (token) out.push({ userId, token });
    }
    const shared = this.config.get<string>('auth.token');
    if (shared) out.push({ userId: defaultUserId, token: shared });
    return out;
  }

  private bearer(header?: string): string | undefined {
    if (!header) return undefined;
    const [scheme, value] = header.split(' ');
    return scheme?.toLowerCase() === 'bearer' && value ? value : undefined;
  }

  /** Constant-time comparison so a wrong token can't be timing-probed. */
  private matches(a: string, b: string): boolean {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ab.length !== bb.length) return false;
    return timingSafeEqual(ab, bb);
  }
}
