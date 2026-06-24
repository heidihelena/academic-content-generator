import { ContentPlan, ContentPoint } from '../content-plan/content-plan.types';
import { TalkComposeOptions } from './talk-composer.types';

/** Prompts + JSON schemas for the Claude-backed talk and short composers. */

export const BODY_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: { body: { type: 'string' } },
  required: ['body'],
};

function planBlock(plan: ContentPlan): string {
  return [
    `Title / hook: ${plan.hook}`,
    'Points (one section each — do not add, drop or reorder; stay faithful to each claim):',
    ...plan.points.map((p, i) => {
      const extra = [p.evidence && `evidence: ${p.evidence}`, p.soWhat && `so what: ${p.soWhat}`]
        .filter(Boolean)
        .join('; ');
      return `  ${i + 1}. ${p.claim}${extra ? ` (${extra})` : ''}`;
    }),
    `Closing call to action: ${plan.cta}`,
  ].join('\n');
}

export function buildTalkUserPrompt(plan: ContentPlan, opts: TalkComposeOptions): string {
  const priorBlock = opts.priorContext?.length
    ? '\nAlready published from this source — keep messaging consistent and do NOT repeat:\n' +
      opts.priorContext.map((c) => `  - ${c}`).join('\n') +
      '\n'
    : '';
  return [
    `Write a spoken conference-talk script of about ${opts.durationMin} minutes ` +
      `(~${Math.round(opts.durationMin * 140)} words) for a ${opts.audience} audience.`,
    '',
    planBlock(plan),
    priorBlock,
    '',
    'Structure: a short opening that earns attention and previews the points; ' +
      'one section per point that states the claim, explains the evidence faithfully ' +
      '(associations as associations, never proof), and draws out why it matters; ' +
      'then a closing that recaps the points and ends on the call to action.',
    'Write natural spoken prose, not bullet points. Do not invent findings, numbers, ' +
      'or citations beyond what the points provide.',
    'Respond as JSON: { "body": string }.',
  ].join('\n');
}

export function buildShortUserPrompt(
  plan: ContentPlan,
  point: ContentPoint,
  index: number,
  audience: string,
  url?: string,
): string {
  return [
    `Write a 30–60 second short-video script (about 90 words) for a ${audience} audience, ` +
      `covering ONLY this one point from the talk "${plan.hook}":`,
    `  ${point.claim}${point.soWhat ? ` (why it matters: ${point.soWhat})` : ''}`,
    '',
    `This is short ${index + 1} of ${plan.points.length}. Open with a one-line hook, ` +
      'state the point, give one line on why it matters, and close with the call to action: ' +
      `${plan.cta}${url ? ` (${url})` : ''}.`,
    'Spoken prose. Do not overclaim or add findings beyond the point. ' +
      'Respond as JSON: { "body": string }.',
  ].join('\n');
}
