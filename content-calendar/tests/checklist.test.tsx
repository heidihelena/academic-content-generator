import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChecklistSection } from '../src/components/ChecklistSection';
import { LocalContentClient, setContentClient } from '../src/content/contentClient';
import type { ChecklistEntry, ContentClient } from '../src/content/contentTypes';

beforeEach(() => vi.useRealTimers());

describe('LocalContentClient checklist', () => {
  it('adds (not done), toggles, lists oldest first, and removes', async () => {
    const client = new LocalContentClient();
    const itemId = (await client.listItems())[0].id;
    const a = await client.addChecklistItem(itemId, 'Alt text');
    await client.addChecklistItem(itemId, 'Co-authors');

    let list = await client.listChecklist(itemId);
    expect(list.map((c) => c.label)).toEqual(['Alt text', 'Co-authors']);
    expect(list.every((c) => !c.done)).toBe(true);

    await client.setChecklistDone(itemId, a.id, true);
    list = await client.listChecklist(itemId);
    expect(list.find((c) => c.id === a.id)?.done).toBe(true);

    await client.removeChecklistItem(itemId, a.id);
    expect(await client.listChecklist(itemId)).toHaveLength(1);
  });

  it('throws when adding to a missing item', async () => {
    await expect(new LocalContentClient().addChecklistItem('ci_nope', 'x')).rejects.toThrow();
  });
});

describe('ChecklistSection', () => {
  function stub(over: Partial<ContentClient> = {}): ContentClient {
    const store: ChecklistEntry[] = [];
    return {
      name: 'stub',
      listChecklist: () => Promise.resolve([...store]),
      addChecklistItem: (itemId: string, label: string) => {
        const e: ChecklistEntry = { id: `ck_${store.length}`, itemId, label, done: false, createdAt: '2026-06-20' };
        store.push(e);
        return Promise.resolve(e);
      },
      setChecklistDone: (_itemId: string, checkId: string, done: boolean) => {
        const e = store.find((c) => c.id === checkId)!;
        e.done = done;
        return Promise.resolve({ ...e });
      },
      removeChecklistItem: () => Promise.resolve(),
      ...over,
    } as unknown as ContentClient;
  }

  it('adds a check and toggles it', async () => {
    setContentClient(stub());
    render(<ChecklistSection itemId="ci_1" />);

    fireEvent.change(screen.getByLabelText('Add a checklist item'), { target: { value: 'Fact-check' } });
    fireEvent.click(screen.getByText('Add'));

    const box = await screen.findByLabelText('Fact-check');
    expect(box).not.toBeChecked();
    fireEvent.click(box);
    expect(await screen.findByLabelText('Fact-check')).toBeChecked();
    expect(screen.getByText('1/1 done')).toBeInTheDocument();
  });

  it('shows existing items on open', async () => {
    setContentClient(
      stub({
        listChecklist: () =>
          Promise.resolve([
            { id: 'ck_x', itemId: 'ci_1', label: 'Already done', done: true, createdAt: '2026-06-19' },
          ]),
      }),
    );
    render(<ChecklistSection itemId="ci_1" />);
    expect(await screen.findByLabelText('Already done')).toBeChecked();
  });
});
