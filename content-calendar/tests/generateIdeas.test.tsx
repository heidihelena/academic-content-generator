import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import App from '../src/App';
import { useStore, __setPersistence } from '../src/store/useStore';
import { MemoryPersistence } from '../src/lib/persistence';
import { setIdeaGenerator } from '../src/ai/ideaService';
import { MockIdeaGenerator } from '../src/ai/mockIdeaGenerator';

function resetStore() {
  // The Generate Ideas flow is async and we assert via RTL's findBy* helpers,
  // which poll on real timers — so opt out of the suite-wide fake timers here.
  vi.useRealTimers();
  __setPersistence(new MemoryPersistence());
  setIdeaGenerator(new MockIdeaGenerator());
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

function gotoIdeas() {
  fireEvent.click(screen.getByRole('button', { name: /Generate Ideas/i }));
}

describe('GenerateIdeas UI', () => {
  beforeEach(resetStore);

  it('renders the input form', () => {
    render(<App />);
    gotoIdeas();
    expect(screen.getByLabelText('Niche')).toBeInTheDocument();
    expect(screen.getByLabelText('Target audience')).toBeInTheDocument();
    expect(screen.getByLabelText('Tone')).toBeInTheDocument();
  });

  it('generates and renders exactly 5 idea cards', async () => {
    render(<App />);
    gotoIdeas();

    fireEvent.change(screen.getByLabelText('Niche'), { target: { value: 'Coffee roasting' } });
    fireEvent.change(screen.getByLabelText('Target audience'), { target: { value: 'Home baristas' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate 5 ideas/i }));


    const cards = await screen.findAllByTestId('idea-card');
    expect(cards).toHaveLength(5);
    // The niche is echoed in the summary line and within several idea topics.
    expect(screen.getAllByText(/Coffee roasting/).length).toBeGreaterThan(0);
  });

  it('surfaces an error when required inputs are blank', async () => {
    render(<App />);
    gotoIdeas();

    fireEvent.change(screen.getByLabelText('Niche'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate 5 ideas/i }));


    expect(await screen.findByRole('alert')).toHaveTextContent(/niche and a target audience/i);
  });

  it('turns an idea into a draft post via "Use"', async () => {
    render(<App />);
    gotoIdeas();

    fireEvent.change(screen.getByLabelText('Niche'), { target: { value: 'Yoga studios' } });
    fireEvent.change(screen.getByLabelText('Target audience'), { target: { value: 'Busy professionals' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate 5 ideas/i }));

    const before = useStore.getState().posts.length;
    const useButtons = await screen.findAllByRole('button', { name: /^Use$/i });
    fireEvent.click(useButtons[0]);

    const posts = useStore.getState().posts;
    expect(posts).toHaveLength(before + 1);
    // The new draft is opened in the editor with the suggested copy.
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(posts[posts.length - 1].status).toBe('draft');
  });
});
