import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  AUDIENCES,
  Audience,
  CONTENT_CHANNELS,
  ClaimRisk,
  ContentChannel,
  ContentItem,
  ContentPillar,
  ContentVariant,
  EvidenceLevel,
  ReviewState,
  SourceMaterial,
  VariantFormat,
  isCleared,
} from '../domain/academic';
import { ContentService } from '../content/content.service';
import { MEDICAL_DISCLAIMER, isPatientFacing } from '../safety/patient-safe';
import { SafetyService } from '../safety/safety.service';
import { citationFinding } from '../safety/citation-finding';
import { CITATION_VERIFIER, CitationVerifier } from '../safety/citation-verifier.types';
import { SourcesService } from '../sources/sources.service';
import { ComposeRequest, DRAFT_COMPOSER, DraftComposer } from './composer.types';

export interface DraftStudioRequest {
  sourceId: string;
  channel: ContentChannel;
  audience: Audience;
  /** Optional angle/hook (e.g. a picked Idea Lab idea) to steer the draft. */
  idea?: { angle?: string; hook?: string };
  /** Optional strategy fields for the content item (sensible defaults otherwise). */
  pillar?: ContentPillar;
  evidenceLevel?: EvidenceLevel;
  claimRisk?: ClaimRisk;
}

/** The natural format for each channel. */
const CHANNEL_FORMAT: Record<ContentChannel, VariantFormat> = {
  linkedin: 'post',
  bluesky: 'thread',
  threads: 'thread',
  instagram: 'post',
  newsletter: 'newsletter-paragraph',
  teaching: 'slide',
  talk: 'talk-script',
  shorts: 'short-script',
};

/**
 * Draft Studio (issue #35): pick a source, compose a draft for a channel +
 * audience, run the claim/safety review, and persist it as a {@link ContentItem}
 * (the idea) with one {@link ContentVariant} (the channel rendering). Further
 * channel/audience variants attach to the same item.
 *
 * Composition is delegated to a `DraftComposer` (deterministic local by default,
 * Claude when configured). The not-medical-advice disclaimer for patient-facing
 * audiences is enforced here so it holds regardless of which composer ran.
 */
@Injectable()
export class DraftStudioService {
  constructor(
    private readonly sources: SourcesService,
    private readonly safety: SafetyService,
    private readonly content: ContentService,
    @Inject(DRAFT_COMPOSER) private readonly composer: DraftComposer,
    @Inject(CITATION_VERIFIER) private readonly citationVerifier: CitationVerifier,
  ) {}

  async create(
    req: DraftStudioRequest,
    now: Date = new Date(),
  ): Promise<{ item: ContentItem; variant: ContentVariant }> {
    this.validate(req.channel, req.audience);
    const source = await this.sources.get(req.sourceId); // throws 404 if missing

    const composed = await this.composer.composeDraft(
      this.composeRequest(source, req.channel, req.audience, req.idea),
    );
    const body = this.ensureDisclaimer(composed, req.audience);
    const safetyReview = this.safety.review(body, now, req.audience);
    await this.verifyAgainstSource(safetyReview, source);

    const item = await this.content.createItem(
      {
        title: source.title,
        sourceIds: [source.id],
        audience: req.audience,
        pillar: req.pillar ?? 'explainer',
        evidenceLevel: req.evidenceLevel ?? 'unknown',
        claimRisk: req.claimRisk ?? (isPatientFacing(req.audience) ? 'moderate' : 'low'),
        status: 'reviewed',
      },
      now,
    );

    const variant = await this.content.addVariant(
      item.id,
      {
        channel: req.channel,
        format: CHANNEL_FORMAT[req.channel],
        body,
        hook: req.idea?.hook,
        status: 'reviewed',
        safetyReview,
      },
      now,
    );

    return { item, variant };
  }

  /** Suggest a single opening hook for a source + channel + audience. */
  async hook(
    sourceId: string,
    channel: ContentChannel,
    audience: Audience,
  ): Promise<{ hook: string }> {
    this.validate(channel, audience);
    const source = await this.sources.get(sourceId);
    const hook = await this.composer.composeHook(this.composeRequest(source, channel, audience));
    return { hook };
  }

  private composeRequest(
    source: SourceMaterial,
    channel: ContentChannel,
    audience: Audience,
    idea?: { angle?: string; hook?: string },
  ): ComposeRequest {
    return {
      title: source.title,
      material: (source.abstract || source.body || '').trim(),
      channel,
      audience,
      hook: idea?.hook,
      angle: idea?.angle,
    };
  }

  private validate(channel: ContentChannel, audience: Audience): void {
    if (!CONTENT_CHANNELS.includes(channel)) {
      throw new BadRequestException(`channel must be one of: ${CONTENT_CHANNELS.join(', ')}`);
    }
    if (!AUDIENCES.includes(audience)) {
      throw new BadRequestException(`audience must be one of: ${AUDIENCES.join(', ')}`);
    }
  }

  private ensureDisclaimer(body: string, audience: Audience): string {
    if (isPatientFacing(audience) && !body.includes(MEDICAL_DISCLAIMER)) {
      return `${body}\n\n${MEDICAL_DISCLAIMER}`;
    }
    return body;
  }

  /**
   * Research norm: content is produced by *citing and modifying* a source. For
   * each empirical claim that leans on the attached source (i.e. carries no
   * inline citation of its own), check the modified claim still reflects that
   * source and fold the result into the review — a contradiction blocks export,
   * an unsupported claim warns, an un-checkable one is only info (a tool gap
   * never blocks). `supported` adds nothing: we surface problems, we never
   * stamp a citation "verified". No-op when the source carries no text to
   * check against.
   */
  private async verifyAgainstSource(review: ReviewState, source: SourceMaterial): Promise<void> {
    const sourceText = (source.abstract || source.body || '').trim();
    if (!sourceText) return;

    const claims = review.claims.filter((c) => c.needsCitation);
    for (const claim of claims) {
      const verification = await this.citationVerifier.verify({ claim: claim.text, sourceText });
      const finding = citationFinding(verification, claim.text);
      if (finding) review.findings.push(finding);
    }
    review.cleared = isCleared(review.findings);
  }
}
