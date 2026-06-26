import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ContentBoard } from '../src/components/ContentBoard';
import type { ContentItemWithVariants, ContentStatus, ContentVariant } from '../src/content/contentTypes';

let seq = 0;
function variant(status: ContentStatus, over: Partial<ContentVariant> = {}): ContentVariant {
  return {
    id: `cv_${seq++}`,
    contentItemId: 'ci_1',
    channel: 'linkedin',
    format: 'post',
    body: 'x',
    hashtags: [],
    status,
    ...over,
  };
}
function item(title: string, variants: ContentVariant[]): ContentItemWithVariants {
  return {
    id: `ci_${seq++}`,
    title,
    sourceIds: [],
    audience: 'peers',
    pillar: 'research-finding',
    evidenceLevel: 'observational',
    claimRisk: 'low',
    status: 'idea',
    variants,
  };
}

describe('ContentBoard', () => {
  it('places each variant in its status column and shows counts', () => {
    const items = [
      item('Trees', [variant('draft'), variant('scheduled')]),
      item('Heat', [variant('draft')]),
    ];
    render(<ContentBoard items={items} onOpen={() => {}} />);

    const draftCol = screen.getByLabelText('Draft');
    expect(within(draftCol).getAllByTestId('board-card')).toHaveLength(2);
    const scheduledCol = screen.getByLabelText('Scheduled');
    expect(within(scheduledCol).getAllByTestId('board-card')).toHaveLength(1);
    // Empty columns render a placeholder, not a card.
    expect(within(screen.getByLabelText('Exported')).queryByTestId('board-card')).toBeNull();
  });

  it('opens the clicked variant', () => {
    const onOpen = vi.fn();
    const v = variant('reviewed');
    render(<ContentBoard items={[item('Trees', [v])]} onOpen={onOpen} />);
    fireEvent.click(screen.getByTestId('board-card'));
    expect(onOpen).toHaveBeenCalledWith(v.id);
  });
});
