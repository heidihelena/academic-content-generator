import { useEffect, useState } from 'react';
import type { CalendarEntry } from '../content/contentTypes';
import { contentClient } from '../content/contentClient';
import { CalendarIcon, CheckIcon } from './icons';
import { Button, Card, Heading } from './ui';

/** Group entries by local calendar day (YYYY-MM-DD), preserving time order. */
function byDay(entries: CalendarEntry[]): Array<[string, CalendarEntry[]]> {
  const groups = new Map<string, CalendarEntry[]>();
  for (const e of entries) {
    const day = new Date(e.scheduledAt).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    (groups.get(day) ?? groups.set(day, []).get(day)!).push(e);
  }
  return [...groups.entries()];
}

function time(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/**
 * Scheduled-content agenda — the calendar surface for ContentVariants. Lists
 * scheduled variants grouped by day; clicking one opens its editor drawer.
 * A `refreshKey` change re-fetches (e.g. after a variant is scheduled).
 */
export function ScheduledAgenda({
  refreshKey,
  onSelect,
}: {
  refreshKey: number;
  onSelect: (variantId: string) => void;
}) {
  const [entries, setEntries] = useState<CalendarEntry[] | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const sync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const { synced } = await contentClient.syncEngagement();
      setSyncMsg(
        synced > 0
          ? `Synced engagement for ${synced} post${synced === 1 ? '' : 's'} — timing suggestions will adapt.`
          : 'No exported posts to sync yet.',
      );
    } catch {
      setSyncMsg('Engagement sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    let live = true;
    contentClient.calendarFeed().then((e) => live && setEntries(e)).catch(() => live && setEntries([]));
    return () => {
      live = false;
    };
  }, [refreshKey]);

  if (!entries) return null;

  return (
    <Card as="section" aria-label="Scheduled content" className="p-4">
      <header className="mb-2 flex items-center gap-2">
        <CalendarIcon width={16} height={16} className="text-brand-400" />
        <Heading>Scheduled</Heading>
        <span className="text-[11px] text-slate-500">{entries.length} upcoming</span>
        <Button
          data-testid="sync-engagement"
          variant="secondary"
          size="sm"
          className="ml-auto"
          loading={syncing}
          onClick={sync}
          title="Pull engagement for exported posts and feed it to the timing optimizer"
        >
          {syncing ? 'Syncing…' : 'Sync engagement'}
        </Button>
      </header>
      {syncMsg && <p data-testid="sync-result" className="mb-2 text-[11px] text-slate-400">{syncMsg}</p>}

      {entries.length === 0 ? (
        <p className="text-xs text-slate-500">Nothing scheduled yet — schedule a variant from its drawer.</p>
      ) : (
        <div className="space-y-3">
          {byDay(entries).map(([day, items]) => (
            <div key={day}>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{day}</p>
              <ul className="space-y-1">
                {items.map((e) => (
                  <li key={e.variantId}>
                    <button
                      data-testid="agenda-entry"
                      onClick={() => onSelect(e.variantId)}
                      className="flex w-full items-center gap-2 rounded-md border border-surface-700 bg-surface-800/50 px-2.5 py-1.5 text-left hover:border-violet-500"
                    >
                      <span className="font-mono text-[11px] text-slate-400">{time(e.scheduledAt)}</span>
                      <span className="truncate text-xs text-slate-300">{e.title}</span>
                      <span className="ml-auto whitespace-nowrap font-mono text-[10px] text-slate-500">{e.channel}</span>
                      {e.exported && <CheckIcon width={12} height={12} className="text-status-published" />}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
