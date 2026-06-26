import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ContentTable } from '../src/components/ContentTable';
import type { ContentItemWithVariants, ContentVariant } from '../src/content/contentTypes';

let seq = 0;
function variant(over: Partial<ContentVariant> = {}): ContentVariant {
  return {
    id: `cv_${seq++}`,
    contentItemId: 'ci_1',
    channel: 'linkedin',
    format: 'post',
    body: 'x',
    hashtags: [],
    status: 'draft',
    ...over,
  };
}
function item(title: string, over: Partial<ContentItemWithVariants> = {}): ContentItemWithVariants {
  return {
    id: `ci_${seq++}`,
    title,
    sourceIds: [],
    audience: 'peers',
    pillar: 'research-finding',
    evidenceLevel: 'observational',
    claimRisk: 'low',
    status: 'idea',
    variants: [variant()],
    ...over,
  };
}

function titlesInOrder(): string[] {
  const body = screen.getByTestId('content-table').querySelector('tbody')!;
  return within(body)
    .getAllByTestId('table-row')
    .map((r) => r.querySelector('td')!.textContent ?? '');
}

describe('ContentTable', () => {
  it('renders a row per variant and shows campaign/owner', () => {
    render(
      <ContentTable
        items={[item('Trees', { campaignId: 'cmp_heat', ownerId: 'alice' })]}
        onOpen={() => {}}
      />,
    );
    expect(screen.getAllByTestId('table-row')).toHaveLength(1);
    expect(screen.getByText('cmp_heat')).toBeInTheDocument();
    expect(screen.getByText('alice')).toBeInTheDocument();
  });

  it('sorts by title and toggles direction on the header', () => {
    render(<ContentTable items={[item('Beta'), item('Alpha')]} onOpen={() => {}} />);
    expect(titlesInOrder()).toEqual(['Alpha', 'Beta']); // default asc by title

    fireEvent.click(screen.getByText(/^Title/));
    expect(titlesInOrder()).toEqual(['Beta', 'Alpha']); // toggled desc
  });

  it('opens the clicked variant', () => {
    const onOpen = vi.fn();
    const it1 = item('Trees');
    render(<ContentTable items={[it1]} onOpen={onOpen} />);
    fireEvent.click(screen.getByTestId('table-row'));
    expect(onOpen).toHaveBeenCalledWith(it1.variants[0].id);
  });
});
