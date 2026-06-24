import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  AUDIENCES,
  Audience,
  CONTENT_CHANNELS,
  ContentChannel,
  ContentOutput,
  SourceMaterial,
} from '../domain/academic';
import { OutputsService } from '../outputs/outputs.service';
import { MEDICAL_DISCLAIMER, isPatientFacing } from '../safety/patient-safe';
import { SafetyService } from '../safety/safety.service';
import { SourcesService } from '../sources/sources.service';
import { ComposeRequest, DRAFT_COMPOSER, DraftComposer } from './composer.types';

export interface DraftStudioRequest {
  sourceId: string;
  channel: ContentChannel;
  audience: Audience;
  /** Optional angle/hook (e.g. a picked Idea Lab idea) to steer the draft. */
  idea?: { angle?: string; hook?: string };
}

/**
 * Draft Studio (issue #35): the end-to-end workflow in one call — pick a source,
 * compose a draft for a channel + audience, and run the claim/safety review.
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
    private readonly outputs: OutputsService,
    @Inject(DRAFT_COMPOSER) private readonly composer: DraftComposer,
  ) {}

  async create(req: DraftStudioRequest, now: Date = new Date()): Promise<ContentOutput> {
    this.validate(req.channel, req.audience);
    const source = await this.sources.get(req.sourceId); // throws 404 if missing

    const composed = await this.composer.composeDraft(
      this.composeRequest(source, req.channel, req.audience, req.idea),
    );
    const body = this.ensureDisclaimer(composed, req.audience);
    const reviewState = this.safety.review(body, now, req.audience);
    const iso = now.toISOString();

    // Persist the reviewed draft so it can move on to scheduled/exported.
    return this.outputs.save({
      id: `co_${randomUUID()}`,
      sourceId: source.id,
      channel: req.channel,
      audience: req.audience,
      body,
      status: 'reviewed',
      reviewState,
      createdAt: iso,
      updatedAt: iso,
    });
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
}
