import type { ConflictPair } from '../lib/conflicts';
import { getPlatformMeta } from '../lib/platforms';
import { formatDateTime } from '../lib/dateUtils';
import { useStore } from '../store/useStore';
import { Modal } from './ui/Modal';
import { PlatformBadge } from './PlatformBadge';

interface Props {
  open: boolean;
  onClose: () => void;
  conflicts: ConflictPair[];
}

/**
 * Lists detected scheduling conflicts (same platform, too close together) and
 * lets the manager jump straight to a post to reschedule it.
 */
export function ConflictWarningModal({ open, onClose, conflicts }: Props) {
  const openEditor = useStore((s) => s.openEditor);

  return (
    <Modal open={open} title="Scheduling conflicts" onClose={onClose} widthClass="max-w-lg">
      {conflicts.length === 0 ? (
        <p className="text-sm text-slate-400">No conflicts 🎉</p>
      ) : (
        <ul className="space-y-3">
          {conflicts.map(({ a, b, gapMinutes }) => (
            <li key={`${a.id}-${b.id}`} className="rounded-lg border border-surface-700 bg-surface-800 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs text-status-failed">
                <PlatformBadge platform={a.platform} showLabel />
                <span>· only {gapMinutes} min apart</span>
              </div>
              {[a, b].map((post) => (
                <button
                  key={post.id}
                  onClick={() => {
                    onClose();
                    openEditor(post.id);
                  }}
                  className="flex w-full items-center justify-between gap-2 rounded px-1 py-1 text-left hover:bg-surface-700"
                >
                  <span className="truncate text-xs text-slate-300">
                    {post.body || 'Empty draft'}
                  </span>
                  <span className="shrink-0 text-[11px] text-slate-500">
                    {formatDateTime(post.scheduledAt)}
                  </span>
                </button>
              ))}
              <p className="mt-1 px-1 text-[11px] text-slate-500">
                Space {getPlatformMeta(a.platform).name} posts further apart to maximize reach.
              </p>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
