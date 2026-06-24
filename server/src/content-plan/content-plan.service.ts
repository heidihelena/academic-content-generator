import { Injectable } from '@nestjs/common';
import { SourceMaterial } from '../domain/academic';
import { SourcesService } from '../sources/sources.service';
import { ContentPlan, ContentPlanOptions } from './content-plan.types';

const DEFAULT_MAX_POINTS = 3;

/** Split prose into trimmed sentences. */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Shorten to `max` chars on a word boundary, with an ellipsis when cut. */
export function shorten(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const at = cut.lastIndexOf(' ');
  return (at > max * 0.5 ? cut.slice(0, at) : cut).replace(/[,;:]$/, '') + '…';
}

/**
 * Extracts a {@link ContentPlan} from a source — deterministic and local-first.
 * The hook is the title; points are the leading sentences of the abstract/body,
 * kept whole (renderers shorten as the surface needs). Points are never
 * fabricated to hit a count: at most `maxPoints`, but only as many as the source
 * actually offers.
 */
@Injectable()
export class ContentPlanService {
  constructor(private readonly sources: SourcesService) {}

  async fromSource(sourceId: string, opts: ContentPlanOptions = {}): Promise<ContentPlan> {
    const source = await this.sources.get(sourceId); // 404 if missing
    return this.build(source, opts);
  }

  build(source: SourceMaterial, opts: ContentPlanOptions = {}): ContentPlan {
    const max = Math.max(1, opts.maxPoints ?? DEFAULT_MAX_POINTS);
    const material = (source.abstract || source.body || '').trim();
    const points = splitSentences(material)
      .slice(0, max)
      .map((claim) => ({ claim }));
    return {
      sourceId: source.id,
      hook: source.title,
      points,
      cta: opts.cta?.trim() || 'Read more.',
    };
  }
}
