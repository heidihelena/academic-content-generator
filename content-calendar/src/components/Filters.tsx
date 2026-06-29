import type { PlatformFilter, PostStatus } from '../types';
import { PLATFORMS, getPlatformMeta } from '../lib/platforms';
import { STAGE_ORDER, STAGE_META } from '../lib/pipeline';
import { useStore } from '../store/useStore';
import { PLATFORM_GLYPHS } from './icons';
import { Select } from './ui';

const STATUS_OPTIONS: Array<{ value: PostStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All stages' },
  ...[...STAGE_ORDER, 'failed' as const].map((value) => ({
    value,
    label: STAGE_META[value].label,
  })),
];

/** Platform + status filters for the calendar. */
export function Filters() {
  const platformFilter = useStore((s) => s.platformFilter);
  const statusFilter = useStore((s) => s.statusFilter);
  const setPlatformFilter = useStore((s) => s.setPlatformFilter);
  const setStatusFilter = useStore((s) => s.setStatusFilter);

  const platformButton = (value: PlatformFilter, label: string) => {
    const active = platformFilter === value;
    const Glyph = value !== 'all' ? PLATFORM_GLYPHS[value] : null;
    const color = value !== 'all' ? getPlatformMeta(value).color : undefined;
    return (
      <button
        key={value}
        aria-pressed={active}
        onClick={() => setPlatformFilter(value)}
        className={`btn px-3 py-1.5 text-xs ${
          active ? 'bg-surface-600 text-white' : 'bg-surface-800 text-slate-400 hover:bg-surface-700'
        }`}
        style={active && color ? { color } : undefined}
      >
        {Glyph && <Glyph width={14} height={14} />}
        {label}
      </button>
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by platform">
        {platformButton('all', 'All')}
        {PLATFORMS.map((p) => platformButton(p, getPlatformMeta(p).name))}
      </div>

      <Select
        aria-label="Filter by status"
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value as PostStatus | 'all')}
        className="w-auto py-1.5 text-xs"
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
