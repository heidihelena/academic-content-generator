import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  AUDIENCES,
  Audience,
  CONTENT_CHANNELS,
  ContentChannel,
  ContentOutput,
  SourceMaterial,
} from '../domain/academic';
import { SafetyService } from '../safety/safety.service';
import { SourcesService } from '../sources/sources.service';

export interface DraftStudioRequest {
  sourceId: string;
  channel: ContentChannel;
  audience: Audience;
  /** Optional angle/hook (e.g. a picked Idea Lab idea) to steer the draft. */
  idea?: { angle?: string; hook?: string };
}

/**
 * Draft Studio (issue #35): the end-to-end workflow in one call — pick a source,
 * generate a draft for a channel + audience, and run the claim/safety review.
 *
 * Composes the local-first services (SourcesService, SafetyService). Draft text
 * is assembled deterministically from the source + idea so the studio works with
 * zero config; the LLM DraftsService can be swapped into `composeDraft` later
 * without changing this contract.
 */
@Injectable()
export class DraftStudioService {
  constructor(
    private readonly sources: SourcesService,
    private readonly safety: SafetyService,
  ) {}

  async create(req: DraftStudioRequest, now: Date = new Date()): Promise<ContentOutput> {
    if (!CONTENT_CHANNELS.includes(req.channel)) {
      throw new BadRequestException(`channel must be one of: ${CONTENT_CHANNELS.join(', ')}`);
    }
    if (!AUDIENCES.includes(req.audience)) {
      throw new BadRequestException(`audience must be one of: ${AUDIENCES.join(', ')}`);
    }
    const source = await this.sources.get(req.sourceId); // throws 404 if missing

    const body = this.composeDraft(source, req.channel, req.audience, req.idea);
    const reviewState = this.safety.review(body, now);
    const iso = now.toISOString();

    return {
      id: `co_${randomUUID()}`,
      sourceId: source.id,
      channel: req.channel,
      audience: req.audience,
      body,
      status: 'reviewed',
      reviewState,
      createdAt: iso,
      updatedAt: iso,
    };
  }

  /** Deterministic, local-first draft assembly from the source + idea. */
  private composeDraft(
    source: SourceMaterial,
    channel: ContentChannel,
    audience: Audience,
    idea?: { angle?: string; hook?: string },
  ): string {
    const hook = idea?.hook?.trim() || `New from our work: ${source.title}`;
    const angle = idea?.angle?.trim() || source.title;
    const gist = (source.abstract || source.body || '').trim().slice(0, 280);

    const lines = [hook, '', `${angle}.`];
    if (gist) lines.push('', gist);
    if (source.tags.length) {
      lines.push('', source.tags.map((t) => `#${t.replace(/\s+/g, '')}`).join(' '));
    }
    lines.push('', `— for ${audience} · ${channel}`);
    return lines.join('\n');
  }
}
