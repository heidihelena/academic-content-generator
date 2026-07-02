import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SourceInbox } from '../src/components/SourceInbox';
import { LocalSourcesClient, setSourcesClient } from '../src/sources/sourcesClient';
import { resetSourceMeta } from '../src/sources/sourceMeta';

describe('SourceInbox upgrade', () => {
  beforeEach(() => {
    vi.useRealTimers();
    setSourcesClient(new LocalSourcesClient());
    resetSourceMeta();
  });

  it('imports a dropped markdown file locally', async () => {
    render(<SourceInbox onDraft={() => {}} />);
    await screen.findByTestId('source-list');

    const file = new File(['Slow-wave sleep consolidates memories.'], 'sleep-notes.md', { type: 'text/markdown' });
    fireEvent.drop(screen.getByTestId('source-dropzone'), { dataTransfer: { files: [file] } });

    expect(await screen.findByTestId('inbox-notice')).toHaveTextContent(/Imported 1 file/);
    expect(await screen.findByText('sleep notes')).toBeInTheDocument();
  });

  it('filters by kind and by status, hiding archived sources from the active view', async () => {
    render(<SourceInbox onDraft={() => {}} />);
    await screen.findByTestId('source-list');
    expect(screen.getAllByTestId('source-status')).toHaveLength(2);

    // Kind filter: only the paper remains.
    fireEvent.click(screen.getByRole('button', { name: 'paper' }));
    expect(screen.getAllByTestId('source-status')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'all' }));

    // Archive one source: it disappears from the default (active) view…
    const statusSelects = screen.getAllByLabelText('Status');
    fireEvent.change(statusSelects[0], { target: { value: 'archived' } });
    await waitFor(() => expect(screen.getAllByTestId('source-status')).toHaveLength(1));

    // …and shows up under the archived filter.
    fireEvent.click(screen.getByRole('button', { name: 'archived' }));
    await waitFor(() => expect(screen.getAllByTestId('source-status')).toHaveLength(1));
    expect(screen.getByTestId('source-status')).toHaveTextContent('archived');
  });

  it('shows extracted key points for a source', async () => {
    render(<SourceInbox onDraft={() => {}} />);
    await screen.findByTestId('source-list');

    fireEvent.click(screen.getAllByRole('button', { name: 'Key points' })[0]);
    const panel = await screen.findByTestId('key-points');
    expect(panel.textContent).toBeTruthy();
  });
});
