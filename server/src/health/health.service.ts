import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface HealthReport {
  status: 'ok';
  /** Seconds the process has been running. */
  uptime: number;
  /** Which interchangeable backends are active — modes only, never secrets, so
   *  this is safe to expose on an unauthenticated probe. */
  config: {
    persistence: string;
    /** `mock` or `llm`; when `llm`, which provider is selected. */
    aiGenerator: string;
    aiProvider: string;
    embeddings: string;
    storage: string;
  };
}

/**
 * Liveness/readiness for the API. Reports the active backend *modes* (mock vs
 * real) so an operator can confirm a deployment is wired as intended — without
 * ever leaking keys, URLs or other secrets.
 */
@Injectable()
export class HealthService {
  constructor(private readonly config: ConfigService) {}

  check(): HealthReport {
    return {
      status: 'ok',
      uptime: Math.round(process.uptime()),
      config: {
        persistence: this.config.get<string>('persistence.driver') ?? 'memory',
        aiGenerator: this.config.get<string>('ai.generator') ?? 'mock',
        aiProvider: this.config.get<string>('ai.provider') ?? 'anthropic',
        embeddings: this.config.get<string>('embeddings.provider') ?? 'mock',
        storage: this.config.get<string>('storage.driver') ?? 'local',
      },
    };
  }
}
