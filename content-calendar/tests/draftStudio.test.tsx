import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from '../src/App';
import { useStore, __setPersistence } from '../src/store/useStore';
import { MemoryPersistence } from '../src/lib/persistence';
import { LocalStudioEngine, setStudioEngine } from '../src/studio/studioEngine';

function resetStore() {
  vi.useRealTimers();
  __setPersistence(new MemoryPersistence());
  setStudioEngine(new LocalStudioEngine());
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

  it('walks compose → draft → review → export for a clean draft', async () => {
    render(<App initialView="studio" />);
    expect(screen.getByRole('button', { name: /Generate draft/i })).toBeDisabled();

    compose('Street trees', 'Tree cover was associated with cooler streets.');
    fireEvent.click(screen.getByRole('button', { name: /Generate draft/i }));
    expect(await screen.findByTestId('studio-draft')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Run review/i }));
    expect(await screen.findByTestId('review-status')).toHaveAttribute('data-cleared');

    fireEvent.click(screen.getByRole('button', { name: /Approve & export/i }));
    expect(await screen.findByTestId('ready-banner')).toBeInTheDocument();
  });

  it('blocks export of unsafe content and lets the author send it back to revise', async () => {
    render(<App initialView="studio" />);

    compose('Wonder cure', 'This drug cures cancer.');
    fireEvent.click(screen.getByRole('button', { name: /Generate draft/i }));
    await screen.findByTestId('studio-draft');
    fireEvent.click(screen.getByRole('button', { name: /Run review/i }));

    const status = await screen.findByTestId('review-status');
    expect(status).not.toHaveAttribute('data-cleared');
    expect(screen.getByRole('button', { name: /Approve & export/i })).toBeDisabled();
    expect(within(screen.getByTestId('findings')).getAllByRole('listitem').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Back/i }));
    expect(screen.getByTestId('studio-draft')).toBeInTheDocument();
  });

  it('saves the reviewed draft to the content calendar as a draft post', async () => {
    render(<App initialView="studio" />);
    compose('Street trees', 'Tree cover was associated with cooler streets.');
    fireEvent.click(screen.getByRole('button', { name: /Generate draft/i }));
    await screen.findByTestId('studio-draft');
    fireEvent.click(screen.getByRole('button', { name: /Run review/i }));
    await screen.findByTestId('review-status');
    fireEvent.click(screen.getByRole('button', { name: /Approve & export/i }));
    await screen.findByTestId('ready-banner');

    const before = useStore.getState().posts.length;
    fireEvent.click(screen.getByRole('button', { name: /Save to calendar/i }));

    expect(screen.getByTestId('studio-saved')).toBeInTheDocument();
    const posts = useStore.getState().posts;
    expect(posts.length).toBe(before + 1);
    const saved = posts[posts.length - 1];
    expect(saved.status).toBe('draft');
    expect(saved.platform).toBe('linkedin');
    expect(saved.body).toContain('Street trees');
  });

  it('suggests a hook into the hook field', async () => {
    render(<App initialView="studio" />);
    compose('Street trees', 'Tree cover and cooler streets.');
    fireEvent.click(screen.getByRole('button', { name: /Suggest hook/i }));
    await waitFor(() =>
      expect((screen.getByLabelText('Hook / angle (optional)') as HTMLInputElement).value).toContain(
        'Street trees',
      ),
    );
  });

  it('appends the not-medical-advice disclaimer for a patient audience', async () => {
    render(<App initialView="studio" />);

    compose('Sleep tips', 'Good sleep supports recovery.');
    fireEvent.change(screen.getByLabelText('Audience'), { target: { value: 'patients' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate draft/i }));

    const draft = (await screen.findByTestId('studio-draft')) as HTMLTextAreaElement;
    expect(draft.value.toLowerCase()).toContain('not medical advice');
  });
});
