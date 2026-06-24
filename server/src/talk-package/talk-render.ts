import { Audience } from '../domain/academic';
import { shorten } from '../content-plan/content-plan.service';
import { ContentPlan, ContentPoint } from '../content-plan/content-plan.types';

/**
 * Pure renderers that turn one {@link ContentPlan} into a long-form talk script
 * and per-point short scripts. Deterministic and local-first — they expand the
 * plan's points into a spoken *scaffold* (state the claim, gesture at the
 * evidence, draw out the "so what"), which the academic then edits. They never
 * assert evidence the plan didn't carry, and they state associations as
 * associations, not proof.
 */

const WORDS_PER_MINUTE = 140;
const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth'];
const DISCLAIMER =
  'This is general information, not medical advice. Talk to a qualified health professional about your situation.';

function isPatientFacing(audience: Audience): boolean {
  return audience === 'patients' || audience === 'public';
}

/** How many points (and therefore shorts) suit a talk of this length. */
export function pointCountForDuration(durationMin: number): number {
  return Math.min(5, Math.max(1, Math.round(durationMin / 4)));
}

/** Estimated spoken minutes for a script, at ~140 wpm (one decimal place). */
export function estimateMinutes(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.round((words / WORDS_PER_MINUTE) * 10) / 10;
}

export interface TalkRenderOptions {
  durationMin: number;
  audience: Audience;
}

export function renderTalk(
  plan: ContentPlan,
  opts: TalkRenderOptions,
): { body: string; estimatedMinutes: number } {
  const n = plan.points.length;
  const lines: string[] = [
    `# ${plan.hook}`,
    `_Target: ~${opts.durationMin}-minute talk · ${n} point${n === 1 ? '' : 's'}_`,
    '',
    '## Opening',
    `${plan.hook}. Over the next few minutes I'll make ${n} point${n === 1 ? '' : 's'} ` +
      `and show how the evidence supports ${n === 1 ? 'it' : 'each one'}.`,
    '',
  ];

  plan.points.forEach((point, i) => {
    lines.push(`## Point ${i + 1} — ${shorten(point.claim, 80)}`);
    lines.push(`My ${ORDINALS[i] ?? `point ${i + 1}`} point: ${point.claim}`);
    lines.push(
      point.evidence
        ? `The evidence: ${point.evidence}`
        : `[Evidence] Walk through what was measured, in whom, and how strong the ` +
            `association is — state it as an association, not proof.`,
    );
    lines.push(
      point.soWhat
        ? `Why it matters: ${point.soWhat}`
        : `[So what] Connect this to a decision the audience makes or a misconception it corrects.`,
    );
    if (i < n - 1) lines.push('That sets up the next point.');
    lines.push('');
  });

  lines.push('## Closing');
  lines.push(
    `To recap${n > 1 ? ` those ${n} points` : ''}: ` +
      `${plan.points.map((p) => shorten(p.claim, 60)).join(' · ')}.`,
  );
  lines.push(plan.cta);
  if (isPatientFacing(opts.audience)) lines.push(DISCLAIMER);

  const body = lines.join('\n');
  return { body, estimatedMinutes: estimateMinutes(body) };
}

/** First clause of a sentence, for a short's attention line. */
function firstClause(sentence: string): string {
  const head = sentence.split(/[,;:.]/)[0].trim();
  return shorten(head || sentence, 70);
}

export function renderShort(
  plan: ContentPlan,
  point: ContentPoint,
  index: number,
  opts: { url?: string; audience: Audience },
): string {
  const lines = [
    `[Short ${index + 1}/${plan.points.length}]`,
    `HOOK: ${firstClause(point.claim)}`,
    `POINT: ${point.claim}`,
    `WHY IT MATTERS: ${
      point.soWhat || 'One line on why this changes how you think or act — no overclaiming.'
    }`,
    `CTA: ${plan.cta}${opts.url ? ` — ${opts.url}` : ''}`,
  ];
  if (isPatientFacing(opts.audience)) lines.push(`NOTE: ${DISCLAIMER}`);
  return lines.join('\n');
}
