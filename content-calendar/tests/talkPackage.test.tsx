import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from '../src/App';
import { useStore, __setPersistence } from '../src/store/useStore';
import { MemoryPersistence } from '../src/lib/persistence';
import { MockTalkPackageClient, setTalkPackageClient } from '../src/ai/talkPackageService';

function resetStore() {
  vi.useRealTimers();
  __setPersistence(new MemoryPersistence());
  useStore.setState({
    posts: [],
    accounts: [],
    platformFilter: 'all',
    statusFilter: 'all',
    editingPostId: null,
    isEditorOpen: false,
    accountBusy: {},
    accountError: {},
    weekAnchor: new Date().toISOString(),
  });
}

const ABSTRACT =
  'Tree cover was associated with cooler streets. ' +
  'Low-income neighbourhoods had less of it. ' +
  'The gap widened during extreme heat.';

/** The talk-package card (the ideas view also renders an "Abstract → thread" card). */
function panel() {
  return within(screen.getByRole('region', { name: 'Talk package' }));
}

function fillAndGenerate(title = 'Street trees and urban heat', abstract = ABSTRACT) {
  const p = panel();
  fireEvent.change(p.getByLabelText('Title'), { target: { value: title } });
  fireEvent.change(p.getByLabelText('Paper abstract'), { target: { value: abstract } });
  fireEvent.click(p.getByRole('button', { name: /Generate talk \+ shorts/i }));
}

describe('Talk package (magic button)', () => {
  beforeEach(() => {
    resetStore();
    setTalkPackageClient(new MockTalkPackageClient()); // fresh state per test
  });

  it('generates a talk + one short per point, cleared by safety review', async () => {
    render(<App initialView="ideas" />);
    fillAndGenerate();

    const result = await screen.findByTestId('talk-package-result', {}, { timeout: 2000 });
    expect(within(result).getByTestId('talk-body').textContent).toContain('## Opening');
    // 12-min default → 3 points → 3 shorts.
    expect(within(result).getAllByTestId('short-item')).toHaveLength(3);
    expect(within(result).getByTestId('review-badge').textContent).toMatch(/cleared/i);
  });

  it('flags an overclaim in the safety review', async () => {
    render(<App initialView="ideas" />);
    fillAndGenerate('Our method proves causation', 'It is 100% accurate and eliminates bias.');

    const badge = await screen.findByTestId('review-badge');
    expect(badge.textContent).toMatch(/finding/i);
  });

  it('surfaces prior work on a second generation from the same source (reuse)', async () => {
    render(<App initialView="ideas" />);
    fillAndGenerate('Repeat source');
    await screen.findByTestId('talk-package-result');

    fillAndGenerate('Repeat source');
    await waitFor(() => expect(screen.getByTestId('talk-prior')).toBeInTheDocument());
    expect(screen.getByTestId('talk-prior').textContent).toMatch(/already made/i);
  });

  it('requires an abstract', async () => {
    render(<App initialView="ideas" />);
    const p = panel();
    fireEvent.change(p.getByLabelText('Title'), { target: { value: 'X' } });
    fireEvent.click(p.getByRole('button', { name: /Generate talk \+ shorts/i }));
    expect(await p.findByText(/Paste an abstract/i)).toBeInTheDocument();
  });
});
