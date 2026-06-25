import { ConfigService } from '@nestjs/config';
import { HealthService } from './health.service';

function serviceWith(values: Record<string, string>): HealthService {
  const config = {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
  return new HealthService(config);
}

describe('HealthService', () => {
  it('reports ok with the active backend modes', () => {
    const report = serviceWith({
      'persistence.driver': 'sqlite',
      'ai.generator': 'llm',
      'ai.provider': 'ollama',
      'embeddings.provider': 'voyage',
      'storage.driver': 's3',
    }).check();

    expect(report.status).toBe('ok');
    expect(typeof report.uptime).toBe('number');
    expect(report.config).toEqual({
      persistence: 'sqlite',
      aiGenerator: 'llm',
      aiProvider: 'ollama',
      embeddings: 'voyage',
      storage: 's3',
    });
  });

  it('falls back to the local-first defaults when config is unset', () => {
    const report = serviceWith({}).check();
    expect(report.config).toEqual({
      persistence: 'memory',
      aiGenerator: 'mock',
      aiProvider: 'anthropic',
      embeddings: 'mock',
      storage: 'local',
    });
  });
});
