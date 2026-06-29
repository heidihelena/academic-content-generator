import { useState } from 'react';
import type { ContentItem, ContentVariant } from '../../content/contentTypes';
import { VARIANT_CHANNELS, VARIANT_FORMATS } from '../../content/contentTypes';
import { contentClient } from '../../content/contentClient';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { Button, Select } from '../ui';
import { PlusIcon } from '../icons';

interface AddVariantProps {
  item: ContentItem & { variants: ContentVariant[] };
  onAdded: (v: ContentVariant) => void;
}

/** Add a new channel/format variant to an item — optionally seeded from an existing one. */
export function AddVariant({ item, onAdded }: AddVariantProps) {
  const [openForm, setOpenForm] = useState(false);
  const [channel, setChannel] = useState('linkedin');
  const [format, setFormat] = useState('post');
  const [copyFrom, setCopyFrom] = useState('');

  const addAction = useAsyncAction(async () => {
    const src = item.variants.find((v) => v.id === copyFrom);
    return contentClient.addVariant(item.id, {
      channel,
      format,
      body: src?.body ?? '',
      hook: src?.hook,
      hashtags: src?.hashtags,
    });
  }, { errorFallback: 'Failed to add variant.' });

  const add = async () => {
    const created = await addAction.run();
    if (created) {
      onAdded(created);
      setOpenForm(false);
    }
  };

  if (!openForm) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpenForm(true)}>
        <PlusIcon width={13} height={13} /> Add variant
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-surface-600 p-2">
      <label className="text-[11px] text-slate-400">
        Channel
        <Select className="mt-0.5 py-1 text-xs" value={channel} onChange={(e) => setChannel(e.target.value)}>
          {VARIANT_CHANNELS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </label>
      <label className="text-[11px] text-slate-400">
        Format
        <Select className="mt-0.5 py-1 text-xs" value={format} onChange={(e) => setFormat(e.target.value)}>
          {VARIANT_FORMATS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </Select>
      </label>
      <label className="text-[11px] text-slate-400">
        Copy text from
        <Select className="mt-0.5 py-1 text-xs" value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)}>
          <option value="">(blank)</option>
          {item.variants.map((v) => (
            <option key={v.id} value={v.id}>
              {v.channel} · {v.format}
            </option>
          ))}
        </Select>
      </label>
      <Button size="sm" loading={addAction.loading} onClick={add}>
        Add
      </Button>
      <Button variant="secondary" size="sm" onClick={() => setOpenForm(false)}>
        Cancel
      </Button>
      {addAction.error && <span className="text-xs text-status-overdue">{addAction.error}</span>}
    </div>
  );
}
