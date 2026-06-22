import type { ThreadAudience, ThreadDrafter, ThreadDraftResult, ThreadRequest } from './threadTypes';
import { getPlatformMeta } from '../lib/platforms';
import { packToLimit, numberThread, COUNTER_RESERVE } from '../lib/thread';
import { buildThreadUserPrompt } from './threadPrompt';

/**
 * Deterministic, offline abstract → thread drafter.
 *
 * It does NOT fabricate claims: it restructures the abstract's own sentences
 * into a thread scaffold (plain hook → key findings → why it matters → source),
 * trims common academic hedging/openers, tailors a framing line to the audience,
 * and fits everything to the platform's character limit. The result is a draft
 * the researcher edits — and the same contract a real LLM client would satisfy.
 */

/** Result-signal words mark sentences likely to carry findings. */
const RESULT_RE =
  /\b(found|find|show(?:s|ed)?|demonstrat\w+|reveal\w*|observ\w+|associat\w+|correlat\w+|increas\w+|decreas\w+|reduc\w+|higher|lower|greater|significant\w*|\d+\s?%|\d+(?:\.\d+)?\s?(?:fold|x)\b)/i;

/** Implication words mark the "so what" sentence. */
const IMPLICATION_RE =
  /\b(suggest\w*|implicat\w+|conclud\w+|highlight\w*|important\w*|matters?|should|could|recommend\w*|policy|implies|underscore\w*|need(?:s|ed)?)\b/i;

/** Leading phrases to strip so a sentence reads as a direct statement. */
const OPENER_RE =
  /^(?:in (?:this|the present|our) (?:study|paper|work|analysis)|here(?:in)?|in this article|this (?:study|paper|work|article)|using [^,]+)[,\s]*(?:we\s+)?/i;

/** Hedging wrappers to strip from a finding, keeping the clause itself. */
const HEDGE_RE =
  /^(?:our|the|these)?\s*(?:results?|findings?|data|analyses?|study)?\s*(?:show(?:s|ed)?|reveal(?:s|ed)?|demonstrat\w+|indicat\w+|suggest\w*|found|find|confirm\w*)\s+that\s+/i;

const AUDIENCE_INTRO: Record<ThreadAudience, string> = {
  'general public': 'New from our lab, in plain language:',
  'fellow researchers': 'New from our group:',
  students: 'A quick explainer of our new study:',
  policymakers: 'What our new study means for policy:',
  journalists: 'Story tip — new findings from our team:',
};

function sentencesOf(text: string): string[] {
  return (text.match(/[^.!?]+[.!?]*/g) ?? [text]).map((s) => s.trim()).filter(Boolean);
}

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/** Tidy a sentence into a direct statement: strip openers/hedges, capitalize. */
function tidy(sentence: string): string {
  let s = sentence.replace(OPENER_RE, '').replace(HEDGE_RE, '').trim();
  s = capitalize(s);
  if (s && !/[.!?]$/.test(s)) s += '.';
  return s;
}

/** Build the logical thread parts (before fitting to a platform limit). */
export function buildThreadParts(request: ThreadRequest): string[] {
  const sentences = sentencesOf(request.abstract);
  if (sentences.length === 0) return [];

  const hook = tidy(sentences[0]);
  const rest = sentences.slice(1);

  // Findings: sentences carrying a result signal (fall back to the next few).
  let findings = rest.filter((s) => RESULT_RE.test(s)).slice(0, 4);
  if (findings.length === 0) findings = rest.slice(0, 3);

  // "So what": last implication sentence not already used as a finding.
  const soWhat = [...rest].reverse().find((s) => IMPLICATION_RE.test(s) && !findings.includes(s));

  const parts: string[] = [];
  parts.push(`${AUDIENCE_INTRO[request.audience]} ${hook} 🧵`);
  for (const f of findings) parts.push(`🔑 ${tidy(f)}`);
  if (soWhat) parts.push(`Why it matters: ${tidy(soWhat)}`);
  if (request.sourceUrl?.trim()) parts.push(`📄 Read the paper: ${request.sourceUrl.trim()}`);

  return parts;
}

export class MockThreadDrafter implements ThreadDrafter {
  readonly name = 'mock-thread-drafter-v1';

  async draft(request: ThreadRequest): Promise<ThreadDraftResult> {
    // Build the prompt even though we don't send it — mirrors a real client and
    // keeps the prompt path exercised.
    void buildThreadUserPrompt(request);

    if (!request.abstract.trim()) {
      throw new Error('Paste an abstract to draft a thread.');
    }

    // Simulate model latency so the UI's loading state is exercised.
    await new Promise((r) => setTimeout(r, 600));

    const limit = getPlatformMeta(request.platform).characterLimit;
    const logical = buildThreadParts(request);
    // Fit each logical part to the limit (leaving room for the (i/n) counter).
    const flat = logical.flatMap((part) => packToLimit(part, limit - COUNTER_RESERVE));
    const parts = numberThread(flat);

    return { request, parts, source: this.name };
  }
}
