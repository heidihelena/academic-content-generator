import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ReviewQueueScreen } from '../src/components/ReviewQueueScreen';
import { classifyIssues } from '../src/review/reviewIssues';
import { useStore, __setPersistence } from '../src/store/useStore';
import { MemoryPersistence } from '../src/lib/persistence';
import type { Post } from '../src/types';

function post(overrides: Partial<Post>): Post {
  return {
    id: overrides.id ?? 'p1',
    platform: 'linkedin',
    body: 'A quiet reflection.',
    scheduledAt: '2026-06-20T09:00:00.000Z',
    status: 'review',
    media: [],
    createdAt: '2026-06-16T09:00:00.000Z',
    updatedAt: '2026-06-16T09:00:00.000Z',
    ...overrides,
  } as Post;
}

describe('classifyIssues', () => {
  it('maps overclaims to blocking issues and uncited stats to citation-needed', () => {
    const issues = classifyIssues('This cures the disease. Admissions fell 24%.', 'peers');
    expect(issues.some((i) => i.type === 'overclaim' && i.severity === 'blocking')).toBe(true);
    expect(issues.some((i) => i.type === 'citation needed' && i.severity === 'high')).toBe(true);
  });

  it('returns nothing for benign copy', () => {
    expect(classifyIssues('Thoughts on a decade of teaching.', 'peers')).toEqual([]);
  });
});

describe('ReviewQueueScreen', () => {
  beforeEach(() => {
    vi.useRealTimers();
    __setPersistence(new MemoryPersistence());
    useStore.setState({ posts: [], accounts: [], editingPostId: null, isEditorOpen: false });
  });

  it('shows an empty state when nothing needs review', () => {
    render(<ReviewQueueScreen />);
    expect(screen.getByText(/Nothing waiting for review/)).toBeInTheDocument();
  });

  it('lists drafts, gates approval on blocking issues, and allows an explicit override', () => {
    useStore.setState({ posts: [post({ id: 'p_block', body: 'This treatment cures cancer.' })] });
    render(<ReviewQueueScreen />);

    expect(screen.getAllByTestId('review-entry')).toHaveLength(1);
    expect(screen.getByText('blocked')).toBeInTheDocument();

    const approve = screen.getByRole('button', { name: /Approve/ });
    expect(approve).toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox'));
    expect(approve).toBeEnabled();

    fireEvent.click(approve);
    expect(useStore.getState().posts[0].status).toBe('approved');
  });

  it('approves clean drafts without an override', () => {
    useStore.setState({ posts: [post({ id: 'p_clean', body: 'A note on our teaching approach.' })] });
    render(<ReviewQueueScreen />);
    expect(screen.getByText('no flags')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Approve/ }));
    expect(useStore.getState().posts[0].status).toBe('approved');
  });
});
