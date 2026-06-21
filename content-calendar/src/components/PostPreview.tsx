import type { ConnectedAccount, Platform } from '../types';
import { getPlatformMeta } from '../lib/platforms';
import { PLATFORM_GLYPHS, ImageIcon } from './icons';

interface PostPreviewProps {
  platform: Platform;
  body: string;
  account?: ConnectedAccount;
  hasMedia: boolean;
  mediaLabel?: string;
}

/**
 * Renders a lightweight, platform-styled preview of how a post will appear.
 * Each platform gets a slightly different chrome so the manager can sanity-check
 * tone and length before publishing.
 */
export function PostPreview({ platform, body, account, hasMedia, mediaLabel }: PostPreviewProps) {
  const meta = getPlatformMeta(platform);
  const Glyph = PLATFORM_GLYPHS[platform];
  const handle = account?.handle ?? meta.handlePrefix + 'vahtian';
  const name = account?.displayName ?? 'vahtian';

  return (
    <div className="overflow-hidden rounded-xl border border-surface-700 bg-surface-950">
      <div className="flex items-center gap-2 border-b border-surface-700 px-3 py-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full"
          style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
        >
          <Glyph width={16} height={16} />
        </div>
        <div className="leading-tight">
          <p className="text-xs font-semibold text-slate-200">{name}</p>
          <p className="text-[11px] text-slate-500">{handle}</p>
        </div>
        <span className="ml-auto text-[11px] text-slate-500">{meta.name}</span>
      </div>

      {/* Instagram leads with media; LinkedIn/Threads lead with text. */}
      {platform === 'instagram' && hasMedia && (
        <div className="flex aspect-square items-center justify-center bg-surface-800 text-slate-500">
          <div className="flex flex-col items-center gap-1">
            <ImageIcon width={28} height={28} />
            <span className="text-[11px]">{mediaLabel ?? 'Media preview'}</span>
          </div>
        </div>
      )}

      <div className="px-3 py-2.5">
        <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-300">
          {body || <span className="italic text-slate-600">Your caption will appear here…</span>}
        </p>
        {platform !== 'instagram' && hasMedia && (
          <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-surface-700 bg-surface-800 px-2.5 py-2 text-[11px] text-slate-500">
            <ImageIcon width={14} height={14} />
            {mediaLabel ?? 'Attached media'}
          </div>
        )}
      </div>
    </div>
  );
}
