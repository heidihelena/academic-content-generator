import { useEffect, useState } from 'react';
import { contentClient } from '../content/contentClient';
import type { ChecklistEntry } from '../content/contentTypes';
import { Button, Input } from './ui';

/**
 * Pre-publish QA checklist on a content item — tick off "added alt text",
 * "tagged co-authors", "fact-checked" before it ships. Lives in the variant
 * drawer (which carries the item) alongside the comments thread.
 */
export function ChecklistSection({ itemId }: { itemId: string }) {
  const [items, setItems] = useState<ChecklistEntry[]>([]);
  const [label, setLabel] = useState('');

  useEffect(() => {
    let active = true;
    contentClient
      .listChecklist(itemId)
      .then((c) => active && setItems(c))
      .catch(() => active && setItems([]));
    return () => {
      active = false;
    };
  }, [itemId]);

  const add = async () => {
    if (!label.trim()) return;
    const entry = await contentClient.addChecklistItem(itemId, label.trim());
    setItems((prev) => [...prev, entry]);
    setLabel('');
  };

  const toggle = async (entry: ChecklistEntry) => {
    const next = await contentClient.setChecklistDone(itemId, entry.id, !entry.done);
    setItems((prev) => prev.map((c) => (c.id === next.id ? next : c)));
  };

  const remove = async (entry: ChecklistEntry) => {
    await contentClient.removeChecklistItem(itemId, entry.id);
    setItems((prev) => prev.filter((c) => c.id !== entry.id));
  };

  const doneCount = items.filter((c) => c.done).length;

  return (
    <div className="space-y-3 border-t border-surface-700 pt-4" data-testid="checklist-section">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-300">Checklist</p>
        {items.length > 0 && (
          <span className="text-[11px] text-slate-500">
            {doneCount}/{items.length} done
          </span>
        )}
      </div>

      {items.length > 0 && (
        <ul className="space-y-1" data-testid="checklist-list">
          {items.map((c) => (
            <li key={c.id} className="group flex items-center gap-2">
              <input
                type="checkbox"
                checked={c.done}
                onChange={() => toggle(c)}
                aria-label={c.label}
                className="h-3.5 w-3.5 rounded border-surface-600"
              />
              <span className={`flex-1 text-xs ${c.done ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                {c.label}
              </span>
              <button
                onClick={() => remove(c)}
                aria-label={`Remove ${c.label}`}
                className="text-[11px] text-slate-600 opacity-0 hover:text-status-overdue group-hover:opacity-100"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-1.5">
        <Input
          className="flex-1 text-xs"
          placeholder="Add a check…"
          aria-label="Add a checklist item"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <Button variant="secondary" size="sm" disabled={!label.trim()} onClick={add}>
          Add
        </Button>
      </div>
    </div>
  );
}
