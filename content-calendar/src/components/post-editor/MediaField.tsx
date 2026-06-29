import type { RefObject } from 'react';
import type { MediaAttachment } from '../../types';
import { Button, Label } from '../ui';
import { ImageIcon, VideoIcon, TrashIcon } from '../icons';

interface MediaFieldProps {
  media: MediaAttachment[];
  uploading: boolean;
  uploadError: string | null;
  fileInputRef: RefObject<HTMLInputElement>;
  onAdd: (type: MediaAttachment['type']) => void;
  onRemove: (id: string) => void;
  onPickFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/** Attached media chips plus add-placeholder and real-upload controls. */
export function MediaField({ media, uploading, uploadError, fileInputRef, onAdd, onRemove, onPickFile }: MediaFieldProps) {
  return (
    <div>
      <Label>Media</Label>
      <div className="flex flex-wrap gap-2">
        {media.map((m) => (
          <span
            key={m.id}
            className="inline-flex items-center gap-1.5 rounded-lg border border-surface-600 bg-surface-800 px-2.5 py-1.5 text-xs text-slate-300"
          >
            {m.type === 'video' ? <VideoIcon width={14} height={14} /> : <ImageIcon width={14} height={14} />}
            {m.label}
            <button aria-label="Remove media" onClick={() => onRemove(m.id)} className="text-slate-500 hover:text-status-failed">
              <TrashIcon width={13} height={13} />
            </button>
          </span>
        ))}
        <Button variant="secondary" size="sm" onClick={() => onAdd('image')}>
          <ImageIcon width={14} height={14} /> Add image
        </Button>
        <Button variant="secondary" size="sm" onClick={() => onAdd('video')}>
          <VideoIcon width={14} height={14} /> Add video
        </Button>
        {/* Real upload: stores the file via the backend (or an object URL
            offline) and attaches a usable URL — required for Instagram. */}
        <Button variant="secondary" size="sm" loading={uploading} onClick={() => fileInputRef.current?.click()}>
          {!uploading && <ImageIcon width={14} height={14} />}
          {uploading ? 'Uploading…' : 'Upload file'}
        </Button>
        <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={onPickFile} />
      </div>
      {uploadError && <p className="mt-1 text-[11px] text-status-failed">{uploadError}</p>}
    </div>
  );
}
