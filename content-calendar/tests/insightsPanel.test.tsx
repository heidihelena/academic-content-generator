import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InsightsPanel } from '../src/components/InsightsPanel';
import { setContentClient } from '../src/content/contentClient';
import type { ContentClient } from '../src/content/contentTypes';
import type { ContentItemWithVariants } from '../src/content/contentTypes';

beforeEach(() => vi.useRealTimers());

function clientReturning(items: ContentItemWithVariants[]): ContentClient {
  return { name: 'stub', listItems: () => Promise.resolve(items) } as unknown as ContentClient;
}

const idea: ContentItemWithVariants = {
  id: 'ci_1',
  title: 'Untouched idea',
  sourceIds: [],
  audience: 'peers',
  pillar: 'research-finding',
  evidenceLevel: 'observational',
  claimRisk: 'low',
  status: 'idea',
  variants: [],
};

describe('InsightsPanel', () => {
  it('renders the attention panel with a derived nudge', async () => {
    setContentClient(clientReturning([idea]));
    render(<InsightsPanel />);
    expect(await screen.findByText('What needs attention')).toBeInTheDocument();
    expect(screen.getByText('Ideas with no draft yet')).toBeInTheDocument();
  });

  it('renders nothing when there is nothing to flag', async () => {
    setContentClient(clientReturning([]));
    const { container } = render(<InsightsPanel />);
    // Give the effect a tick; with no insights the panel stays empty.
    await Promise.resolve();
    expect(container.querySelector('section')).toBeNull();
    expect(screen.queryByText('What needs attention')).not.toBeInTheDocument();
  });
});
