import { LlmClient } from '../ai/llm-client';
import { SafetyFinding } from '../domain/academic';
import { claimsNeedingCitation } from '../safety/citation';
import { reviewOverclaiming } from '../safety/overclaiming';
import { escalateForAudience } from '../safety/patient-safe';
import { ComposeRequest, DraftComposer } from './composer.types';
import { LlmDraftComposer } from './llm.composer';
import {
  DRAFT_JSON_SCHEMA,
  buildRevisionUserPrompt,
  composerSystemPrompt,
} from './composer.prompts';

/** Hard cap on self-review revision rounds: at most 3 LLM calls per draft. */
const MAX_REVISIONS = 2;

/** One composed draft plus what the safety review made of it. */
interface Attempt {
  body: string;
  findings: SafetyFinding[];
  /** `block`-severity findings — the ones that gate export. */
  blocks: number;
}

/**
 * Agentic composer (COMPOSER_MODE=agentic): wraps the LLM composer with a
 * bounded compose → safety-review → revise loop, so weaker local models
 * (Ollama) hand the Draft Studio *reviewed* output instead of one-shot text.
 *
 * Each round runs the same medical-safety review the Draft Studio applies
 * afterwards; if it raises findings, the model gets its own draft back with the
 * findings and is asked to revise. The best attempt wins (fewest blocks, then
 * fewest findings; later rounds preferred on ties). Any error falls back to the
 * single-shot result — and the inner composer already falls back to the local
 * one — so the endpoint never fails.
 */
export class AgenticDraftComposer implements DraftComposer {
  readonly name: string;
  private readonly inner: LlmDraftComposer;

  constructor(private readonly client: LlmClient) {
    this.inner = new LlmDraftComposer(client);
    this.name = `agentic:${client.name}`;
  }

  /** Hooks are one line — a review loop adds nothing, so delegate as-is. */
  composeHook(req: ComposeRequest): Promise<string> {
    return this.inner.composeHook(req);
  }

  async composeDraft(req: ComposeRequest): Promise<string> {
    // Single-shot first; on error this is already the local-composer fallback.
    const first = await this.inner.composeDraft(req);
    try {
      return await this.revise(req, first);
    } catch {
      return first; // never fail: the single-shot draft is always usable
    }
  }

  /** The bounded self-review loop. Returns the best attempt's body. */
  private async revise(req: ComposeRequest, first: string): Promise<string> {
    let current = this.review(req, first);
    let best = current;

    for (let round = 0; round < MAX_REVISIONS && current.findings.length > 0; round++) {
      const { body } = await this.client.completeJson<{ body: string }>({
        system: composerSystemPrompt(req.audience),
        user: buildRevisionUserPrompt(
          req,
          current.body,
          current.findings,
          claimsNeedingCitation(current.body).map((c) => c.text),
        ),
        schema: DRAFT_JSON_SCHEMA,
        maxTokens: 2048,
      });
      if (!body?.trim()) break; // an empty revision can't beat anything

      current = this.review(req, body.trim());
      if (this.betterOrEqual(current, best)) best = current;
    }

    return best.body;
  }

  /** Same reviewers the Draft Studio runs afterwards (audience-escalated). */
  private review(req: ComposeRequest, body: string): Attempt {
    const findings = escalateForAudience(reviewOverclaiming(body), req.audience);
    return { body, findings, blocks: findings.filter((f) => f.severity === 'block').length };
  }

  /** Fewest blocks, then fewest findings; later iterations win ties. */
  private betterOrEqual(candidate: Attempt, best: Attempt): boolean {
    if (candidate.blocks !== best.blocks) return candidate.blocks < best.blocks;
    return candidate.findings.length <= best.findings.length;
  }
}
