import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContentTable } from '../src/components/ContentTable';
import { LocalContentClient } from '../src/content/contentClient';
import type { ContentItemWithVariants } from '../src/content/contentTypes';

function item(campaignId?: string): ContentItemWithVariants {
  return {
    id: 'ci_1',
    title: 'Trees',
    sourceIds: [],
    campaignId,
    audience: 'peers',
    pillar: 'research-finding',
    evidenceLevel: 'observational',
    claimRisk: 'low',
    status: 'idea',
    variants: [
      {
        id: 'cv_1',
        contentItemId: 'ci_1',
        channel: 'linkedin',
        format: 'post',
        body: 'x',
        hashtags: [],
        status: 'draft',
      },
    ],
  };
}

describe('LocalContentClient campaigns', () => {
  it('lists campaigns with readable names', async () => {
    const campaigns = await new LocalContentClient().listCampaigns();
    expect(campaigns.find((c) => c.id === 'cmp_heat')?.title).toBe('Urban Heat');
  });
});

describe('ContentTable campaign resolution', () => {
  it('shows the campaign name when the map has it', () => {
    render(
      <ContentTable
        items={[item('cmp_heat')]}
        onOpen={() => {}}
        campaigns={new Map([['cmp_heat', 'Urban Heat']])}
      />,
    );
    expect(screen.getByText('Urban Heat')).toBeInTheDocument();
  });

  it('falls back to the id when the campaign is unknown', () => {
    render(<ContentTable items={[item('cmp_x')]} onOpen={() => {}} campaigns={new Map()} />);
    expect(screen.getByText('cmp_x')).toBeInTheDocument();
  });
});
