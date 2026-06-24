import { ContentPlan } from '../content-plan/content-plan.types';
import { pointCountForDuration, renderShort, renderTalk } from './talk-render';

const plan: ContentPlan = {
  sourceId: 'src_1',
  hook: 'Street trees and urban heat',
  points: [
    { claim: 'Tree cover was associated with cooler streets.' },
    { claim: 'Low-income areas had less of it.' },
  ],
  cta: 'Read the study.',
};

describe('pointCountForDuration', () => {
  it('scales with length and clamps to 1..5', () => {
    expect(pointCountForDuration(12)).toBe(3);
    expect(pointCountForDuration(5)).toBe(1);
    expect(pointCountForDuration(20)).toBe(5);
    expect(pointCountForDuration(120)).toBe(5);
  });
});

describe('renderTalk', () => {
  it('renders opening, one section per point, and a closing recap', () => {
    const { body, estimatedMinutes } = renderTalk(plan, { durationMin: 12, audience: 'peers' });
    expect(body).toContain('## Opening');
    expect(body).toContain('## Point 1 — Tree cover was associated with cooler streets.');
    expect(body).toContain('## Point 2 —');
    expect(body).toContain('## Closing');
    expect(body).toContain('Read the study.');
    expect(estimatedMinutes).toBeGreaterThan(0);
  });

  it('appends the medical disclaimer for patient-facing audiences only', () => {
    expect(renderTalk(plan, { durationMin: 12, audience: 'public' }).body).toContain(
      'not medical advice',
    );
    expect(renderTalk(plan, { durationMin: 12, audience: 'peers' }).body).not.toContain(
      'not medical advice',
    );
  });
});

describe('renderShort', () => {
  it('renders one point as a hook/point/why/cta script with the URL', () => {
    const short = renderShort(plan, plan.points[0], 0, { url: 'vahtian.com/x', audience: 'peers' });
    expect(short).toContain('[Short 1/2]');
    expect(short).toContain('HOOK: Tree cover was associated with cooler streets');
    expect(short).toContain('POINT: Tree cover was associated with cooler streets.');
    expect(short).toContain('CTA: Read the study. — vahtian.com/x');
  });
});
