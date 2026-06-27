import { Module } from '@nestjs/common';
import { SafetyController } from './safety.controller';
import { SafetyService } from './safety.service';
import { citationVerifierProvider } from './citation-verifier.factory';
import { CITATION_VERIFIER } from './citation-verifier.types';

/** Claim + medical-safety review for academic content (forskai Version 1). */
@Module({
  providers: [SafetyService, citationVerifierProvider],
  controllers: [SafetyController],
  // export the configured citation-support verifier (CITATION_VERIFIER=local|citevahti)
  // so other modules can inject it via the CITATION_VERIFIER token.
  exports: [SafetyService, CITATION_VERIFIER],
})
export class SafetyModule {}
