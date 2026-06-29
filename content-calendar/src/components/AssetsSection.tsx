import { useEffect, useState } from 'react';
import { contentClient } from '../content/contentClient';
import type { AssetEntry } from '../content/contentTypes';
import { Button } from './ui';

/**
 * Media attachments on a content item — the image/video that ships with it (a
 * carousel cover, a figure, a clip). Attach by URL (the bytes are uploaded via
 * the media endpoint elsewhere); image URLs preview inline. Lives in the variant
 * drawer alongside the checklist and comments.
 */
export function AssetsSection({ itemId }: { itemId: string }) {
  const [assets, setAssets] = useState<AssetEntry[]>([]);
  const [url, setUrl] = useState('');
  const [type, setType] = useState<'image' | 'video'>('image');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    contentClient
      .listAssets(itemId)
      .then((a) => active && setAssets(a))
      .catch(() => active && setAssets([]));
    return () => {
      active = false;
    };
  }, [itemId]);

  const attach = async () => {
    if (!url.trim()) return;
    setError(null);
    try {
      const entry = await contentClient.attachAsset(itemId, { url: url.trim(), type });
      setAssets((prev) => [...prev, entry]);
      setUrl('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to attach media.');
    }
  };

  const remove = async (entry: AssetEntry) => {
    await contentClient.removeAsset(itemId, entry.id);
    setAssets((prev) => prev.filter((a) => a.id !== entry.id));
  };

  return (
    <div className="space-y-3 border-t border-surface-700 pt-4" data-testid="assets-section">
      <p className="text-xs font-semibold text-slate-300">Media</p>

      {assets.length > 0 && (
        <ul className="flex flex-wrap gap-2" data-testid="assets-list">
          {assets.map((a) => (
            <li key={a.id} className="group relative">
              {a.type === 'image' ? (
                <img src={a.url} alt={a.label ?? 'attachment'} className="h-16 w-16 rounded object-cover" />
              ) : (
                <a
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-16 w-16 items-center justify-center rounded bg-surface-800 text-[10px] text-slate-400"
                >
                  ▶ video
                </a>
              )}
              <button
                onClick={() => remove(a)}
                aria-label={`Remove ${a.label ?? a.url}`}
                className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 items-center justify-center rounded-full bg-surface-900 text-[10px] text-status-overdue group-hover:flex"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-1.5">
        <input
          className="input flex-1 text-xs"
          placeholder="Media URL…"
          aria-label="Media URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <select
          className="input text-xs"
          aria-label="Media type"
          value={type}
          onChange={(e) => setType(e.target.value as 'image' | 'video')}
        >
          <option value="image">image</option>
          <option value="video">video</option>
        </select>
        <Button variant="secondary" size="sm" disabled={!url.trim()} onClick={attach}>
          Attach
        </Button>
      </div>

      {error && <p className="text-xs text-status-overdue">{error}</p>}
    </div>
  );
}
