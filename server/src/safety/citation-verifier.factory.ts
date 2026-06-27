import { Logger, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CitationVerifierProvider } from '../config/configuration';
import { CiteVahtiCitationVerifier } from './citation-verifier.citevahti';
import { LocalCitationVerifier } from './citation-verifier.local';
import { CITATION_VERIFIER, CitationVerifier } from './citation-verifier.types';

/**
 * Selects the citation-support verifier from config — mock-first, the same shape
 * as the platform IntegrationRegistry: `local` (a no-dep heuristic) is the default
 * so the app runs out of the box; `CITATION_VERIFIER=citevahti` swaps in the CLI
 * backend by configuration, not code.
 */
export function createCitationVerifier(config: ConfigService): CitationVerifier {
  const logger = new Logger('CitationVerifier');
  const provider =
    config.get<CitationVerifierProvider>('safety.citationVerifier.provider') ?? 'local';

  if (provider === 'citevahti') {
    const bin = config.get<string>('safety.citationVerifier.citevahtiBin') ?? 'citevahti';
    const timeoutMs = config.get<number>('safety.citationVerifier.timeoutMs') ?? 8000;
    logger.log(`citation support: using the CiteVahti CLI ('${bin}')`);
    return new CiteVahtiCitationVerifier({ bin, timeoutMs });
  }

  logger.log('citation support: using the local heuristic (set CITATION_VERIFIER=citevahti for CiteVahti)');
  return new LocalCitationVerifier();
}

/** NestJS provider binding the configured verifier to the {@link CITATION_VERIFIER} token. */
export const citationVerifierProvider: Provider = {
  provide: CITATION_VERIFIER,
  inject: [ConfigService],
  useFactory: createCitationVerifier,
};
