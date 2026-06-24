import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import App from '../src/App';
import { useStore, __setPersistence } from '../src/store/useStore';
import { MemoryPersistence } from '../src/lib/persistence';

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

function compose(title: string, material: string) {
  fireEvent.change(screen.getByLabelText('Source title'), { target: { value: title } });
  fireEvent.change(screen.getByLabelText('Source material (abstract / notes)'), {
    target: { value: material },
  });
}

describe('Draft Studio', () => {
  beforeEach(resetStore);

  it('walks compose → draft → review → export for a clean draft', () => {
    render(<App initialView="studio" />);

    // Forward is gated until the source is filled in.
    expect(screen.getByRole('button', { name: /Generate draft/i })).toBeDisabled();

    compose('Street trees', 'Tree cover was associated with cooler streets.');
    fireEvent.click(screen.getByRole('button', { name: /Generate draft/i }));
    expect(screen.getByTestId('studio-draft')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Run review/i }));
    expect(screen.getByTestId('review-status')).toHaveAttribute('data-cleared');

    fireEvent.click(screen.getByRole('button', { name: /Approve & export/i }));
    expect(screen.getByTestId('ready-banner')).toBeInTheDocument();
  });

  it('blocks export of unsafe content and lets the author send it back to revise', () => {
    render(<App initialView="studio" />);

    compose('Wonder cure', 'This drug cures cancer.');
    fireEvent.click(screen.getByRole('button', { name: /Generate draft/i }));
    fireEvent.click(screen.getByRole('button', { name: /Run review/i }));

    const status = screen.getByTestId('review-status');
    expect(status).not.toHaveAttribute('data-cleared');
    expect(screen.getByRole('button', { name: /Approve & export/i })).toBeDisabled();
    expect(within(screen.getByTestId('findings')).getAllByRole('listitem').length).toBeGreaterThan(0);

    // Human in the loop: send it back to the draft to revise.
    fireEvent.click(screen.getByRole('button', { name: /Back/i }));
    expect(screen.getByTestId('studio-draft')).toBeInTheDocument();
  });

  it('appends the not-medical-advice disclaimer for a patient audience', () => {
    render(<App initialView="studio" />);

    compose('Sleep tips', 'Good sleep supports recovery.');
    fireEvent.change(screen.getByLabelText('Audience'), { target: { value: 'patients' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate draft/i }));

    expect((screen.getByTestId('studio-draft') as HTMLTextAreaElement).value.toLowerCase()).toContain(
      'not medical advice',
    );
  });
});
