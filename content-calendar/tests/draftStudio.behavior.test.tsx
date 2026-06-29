import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import App from '../src/App';
import { useStore, __setPersistence } from '../src/store/useStore';
import { MemoryPersistence } from '../src/lib/persistence';
import { LocalStudioEngine, setStudioEngine, type StudioEngine } from '../src/studio/studioEngine';
import type { ReviewState } from '../src/studio/studioTypes';

/**
 * Complements draftStudio.test.tsx (happy/blocked/save flows) with the
 * error-path and accessibility behaviour. Everything is driven through the
 * rendered UI via roles/labels — no reaching into component internals.
 */
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
  fireEvent.change(screen.getByLabelText('Source material (abstract / notes)'), { target: { value: material } });
}

const CLEARED: ReviewState = { cleared: true, findings: [], claims: [] };

beforeEach(resetStore);
afterEach(() => setStudioEngine(new LocalStudioEngine()));

describe('Draft Studio — error paths', () => {
  it('announces an error (and stays on Compose) when composing fails', async () => {
    setStudioEngine({
      suggestHook: async () => '',
      compose: async () => {
        throw new Error('compose failed');
      },
      review: async () => CLEARED,
    } satisfies StudioEngine);

    render(<App initialView="studio" />);
    compose('Street trees', 'Tree cover and cooler streets.');
    fireEvent.click(screen.getByRole('button', { name: /Generate draft/i }));

    const error = await screen.findByTestId('studio-error');
    expect(error).toHaveTextContent(/compose failed/i);
    expect(error).toHaveAttribute('role', 'alert'); // announced to screen readers
    expect(screen.queryByTestId('studio-draft')).not.toBeInTheDocument();
  });

  it('announces an error (and keeps the draft) when the review fails', async () => {
    setStudioEngine({
      suggestHook: async () => '',
      compose: async () => 'A composed draft body about trees.',
      review: async () => {
        throw new Error('review failed');
      },
    } satisfies StudioEngine);

    render(<App initialView="studio" />);
    compose('Street trees', 'Tree cover and cooler streets.');
    fireEvent.click(screen.getByRole('button', { name: /Generate draft/i }));
    await screen.findByTestId('studio-draft');
    fireEvent.click(screen.getByRole('button', { name: /Run review/i }));

    const error = await screen.findByTestId('studio-error');
    expect(error).toHaveTextContent(/review failed/i);
    // The draft survives the failed review so the author can retry.
    expect(screen.getByTestId('studio-draft')).toBeInTheDocument();
  });

  it('surfaces an error when a hook suggestion fails', async () => {
    setStudioEngine({
      suggestHook: async () => {
        throw new Error('no hook today');
      },
      compose: async () => 'x',
      review: async () => CLEARED,
    } satisfies StudioEngine);

    render(<App initialView="studio" />);
    compose('Street trees', 'Tree cover and cooler streets.');
    fireEvent.click(screen.getByRole('button', { name: /Suggest hook/i }));

    expect(await screen.findByTestId('studio-error')).toHaveTextContent(/no hook today/i);
  });
});

describe('Draft Studio — accessibility', () => {
  it('marks the current workflow stage with aria-current="step"', async () => {
    render(<App initialView="studio" />);
    expect(screen.getByTestId('stage-compose')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByTestId('stage-draft')).not.toHaveAttribute('aria-current');

    compose('Street trees', 'Tree cover and cooler streets.');
    fireEvent.click(screen.getByRole('button', { name: /Generate draft/i }));
    await screen.findByTestId('studio-draft');

    expect(screen.getByTestId('stage-draft')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByTestId('stage-compose')).not.toHaveAttribute('aria-current');
  });

  it('labels every compose control and names the stages list', () => {
    render(<App initialView="studio" />);
    expect(screen.getByLabelText('Source title')).toBeInTheDocument();
    expect(screen.getByLabelText('Source material (abstract / notes)')).toBeInTheDocument();
    expect(screen.getByLabelText('Channel')).toBeInTheDocument();
    expect(screen.getByLabelText('Audience')).toBeInTheDocument();
    expect(screen.getByLabelText('Hook / angle (optional)')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: /workflow stages/i })).toBeInTheDocument();
  });

  it('keeps the forward action disabled until the stage is satisfiable', () => {
    render(<App initialView="studio" />);
    const generate = () => screen.getByRole('button', { name: /Generate draft/i });
    expect(generate()).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Source title'), { target: { value: 'Only a title' } });
    expect(generate()).toBeDisabled(); // material still missing

    fireEvent.change(screen.getByLabelText('Source material (abstract / notes)'), {
      target: { value: 'now there is material' },
    });
    expect(generate()).toBeEnabled();
  });
});
