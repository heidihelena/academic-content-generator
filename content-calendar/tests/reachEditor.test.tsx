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

describe('Reach preflight in the editor', () => {
  beforeEach(resetStore);

  it('warns about a link in the post (reach-killer) as you type', () => {
    render(<App initialView="calendar" />);
    fireEvent.click(screen.getByRole('button', { name: /New post/i })); // defaults to Instagram

    fireEvent.change(screen.getByLabelText('Script / Copy'), {
      target: { value: 'Our new paper is out https://doi.org/10.1/x' },
    });

    const reach = screen.getByTestId('reach-check');
    expect(reach).toHaveTextContent(/Reach check/i);
    expect(reach).toHaveTextContent(/link in the first comment|links in the post/i);
  });

  it('is clean for a short, plain post with no reach issues', () => {
    render(<App initialView="calendar" />);
    fireEvent.click(screen.getByRole('button', { name: /New post/i }));
    fireEvent.change(screen.getByLabelText('Script / Copy'), {
      target: { value: 'A clear, short finding in plain words.' },
    });
    expect(screen.getByTestId('reach-check')).toHaveTextContent(/nothing here should hurt your reach/i);
  });
});
