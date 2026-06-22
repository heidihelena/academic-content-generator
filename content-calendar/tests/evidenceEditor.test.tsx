import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import App from '../src/App';
import { useStore, __setPersistence } from '../src/store/useStore';
import { MemoryPersistence } from '../src/lib/persistence';

function resetStore() {
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

describe('Evidence & source in the editor', () => {
  beforeEach(resetStore);

  it('saves an evidence level + DOI and links them to the post', () => {
    render(<App initialView="calendar" />);
    fireEvent.click(screen.getByRole('button', { name: /New post/i }));

    fireEvent.change(screen.getByLabelText('Script / Copy'), { target: { value: 'A finding about trees.' } });
    fireEvent.click(screen.getByRole('button', { name: /Peer-reviewed/i }));
    fireEvent.change(screen.getByLabelText('DOI or link'), {
      target: { value: 'https://doi.org/10.1038/abc' },
    });
    fireEvent.change(screen.getByLabelText('Source venue'), { target: { value: 'Nature' } });
    fireEvent.click(screen.getByRole('button', { name: /Save post/i }));

    const saved = useStore.getState().posts.find((p) => p.body === 'A finding about trees.')!;
    expect(saved.evidenceLevel).toBe('peer_reviewed');
    expect(saved.source?.doi).toBe('10.1038/abc'); // normalized from the URL form
    expect(saved.source?.venue).toBe('Nature');
  });

  it('warns when a peer-reviewed claim has no linked source', () => {
    render(<App initialView="calendar" />);
    fireEvent.click(screen.getByRole('button', { name: /New post/i }));
    fireEvent.click(screen.getByRole('button', { name: /Peer-reviewed/i }));
    expect(screen.getByTestId('missing-source')).toBeInTheDocument();

    // Linking a DOI clears the warning.
    fireEvent.change(screen.getByLabelText('DOI or link'), { target: { value: '10.1/x' } });
    expect(screen.queryByTestId('missing-source')).not.toBeInTheDocument();
  });

  it('shows a plain-language check on the copy', () => {
    render(<App initialView="calendar" />);
    fireEvent.click(screen.getByRole('button', { name: /New post/i }));
    fireEvent.change(screen.getByLabelText('Script / Copy'), {
      target: { value: 'We found that more trees keep a street cool. This helps people on hot days.' },
    });
    expect(screen.getByTestId('readability')).toHaveTextContent(/Plain-language check/i);
  });
});
