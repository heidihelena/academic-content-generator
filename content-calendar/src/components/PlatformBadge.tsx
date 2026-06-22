import type { Platform, PostStatus } from '../types';
import { getPlatformMeta } from '../lib/platforms';
import { PLATFORM_GLYPHS } from './icons';

interface PlatformBadgeProps {
  platform: Platform;
  /** When true, shows the platform name next to the glyph. */
  showLabel?: boolean;
  size?: number;
}

/** A platform icon chip tinted with the platform's brand color. */
export function PlatformBadge({ platform, showLabel = false, size = 16 }: PlatformBadgeProps) {
  const meta = getPlatformMeta(platform);
  const Glyph = PLATFORM_GLYPHS[platform];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
      title={meta.name}
    >
      <Glyph width={size} height={size} />
      {showLabel && <span>{meta.name}</span>}
    </span>
  );
}

const STATUS_STYLES: Record<PostStatus, { label: string; className: string }> = {
  brief: { label: 'Brief', className: 'bg-status-brief/15 text-status-brief' },
  draft: { label: 'Drafting', className: 'bg-status-draft/15 text-status-draft' },
  review: { label: 'Review', className: 'bg-status-review/15 text-status-review' },
  approved: { label: 'Approved', className: 'bg-status-approved/15 text-status-approved' },
  scheduled: { label: 'Scheduled', className: 'bg-status-scheduled/15 text-status-scheduled' },
  published: { label: 'Published', className: 'bg-status-published/15 text-status-published' },
  learn: { label: 'Learn', className: 'bg-status-learn/15 text-status-learn' },
  failed: { label: 'Failed', className: 'bg-status-failed/15 text-status-failed' },
};

/** A pill describing a post's lifecycle status. */
export function StatusBadge({ status }: { status: PostStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${s.className}`}>
      {s.label}
    </span>
  );
}
