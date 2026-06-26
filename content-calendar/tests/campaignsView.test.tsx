import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { CampaignsView } from '../src/components/CampaignsView';
import { setContentClient } from '../src/content/contentClient';
import type { Campaign, ContentClient, ContentItemWithVariants } from '../src/content/contentTypes';

beforeEach(() => vi.useRealTimers());

function item(title: string, campaignId: string | undefined, status: ContentItemWithVariants['status']): ContentItemWithVariants {
  return {
    id: `ci_${title}`,
    title,
    sourceIds: [],
    campaignId,
    audience: 'peers',
    pillar: 'research-finding',
    evidenceLevel: 'observational',
    claimRisk: 'low',
    status,
    variants: [],
  };
}

function stub(campaigns: Campaign[], items: ContentItemWithVariants[]): ContentClient {
  return {
    name: 'stub',
    listCampaigns: () => Promise.resolve(campaigns),
    listItems: () => Promise.resolve(items),
  } as unknown as ContentClient;
}

describe('CampaignsView', () => {
  it('groups items under their campaign with a status rollup', async () => {
    setContentClient(
      stub(
        [{ id: 'cmp_heat', title: 'Urban Heat', goal: 'Reach planners', startDate: '2026-06-01', endDate: '2026-07-15' }],
        [item('Trees', 'cmp_heat', 'scheduled'), item('Canopy', 'cmp_heat', 'idea')],
      ),
    );
    render(<CampaignsView />);

    const card = await screen.findByLabelText('Urban Heat');
    expect(within(card).getByText('Reach planners')).toBeInTheDocument();
    expect(within(card).getByText('2026-06-01 → 2026-07-15')).toBeInTheDocument();
    expect(within(card).getByText('2 items')).toBeInTheDocument();
    expect(within(card).getByTestId('rollup-bar')).toBeInTheDocument();
    expect(within(card).getByText('Trees')).toBeInTheDocument();
  });

  it('groups items with no campaign under "No campaign"', async () => {
    setContentClient(stub([], [item('Loose', undefined, 'draft')]));
    render(<CampaignsView />);
    const card = await screen.findByLabelText('No campaign');
    expect(within(card).getByText('Loose')).toBeInTheDocument();
  });

  it('shows an empty state when there is nothing', async () => {
    setContentClient(stub([], []));
    render(<CampaignsView />);
    expect(await screen.findByText('No campaigns yet.')).toBeInTheDocument();
  });
});
