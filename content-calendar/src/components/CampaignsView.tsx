import { useEffect, useState } from 'react';
import { contentClient } from '../content/contentClient';
import type { Campaign, ContentItemWithVariants, ContentStatus } from '../content/contentTypes';
import { Card, ErrorState, Heading, LoadingState } from './ui';

const STATUS_ORDER: ContentStatus[] = ['idea', 'draft', 'reviewed', 'scheduled', 'exported'];
const STATUS_COLOR: Record<ContentStatus, string> = {
  idea: 'bg-slate-500',
  draft: 'bg-sky-500',
  reviewed: 'bg-violet-500',
  scheduled: 'bg-amber-500',
  exported: 'bg-emerald-500',
};

/**
 * Campaigns overview: each campaign with its goal, date range and the content
 * grouped under it, plus a status rollup bar (idea → … → exported) — a
 * campaign's progress at a glance. Items with no campaign are grouped last.
 */
export function CampaignsView() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [items, setItems] = useState<ContentItemWithVariants[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([contentClient.listCampaigns(), contentClient.listItems()])
      .then(([cs, is]) => {
        setCampaigns(cs);
        setItems(is);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load campaigns.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading) return <LoadingState label="Loading campaigns…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const itemsFor = (campaignId: string | undefined) =>
    items.filter((i) => i.campaignId === campaignId);
  const unassigned = items.filter((i) => !i.campaignId || !campaigns.some((c) => c.id === i.campaignId));

  return (
    <div className="space-y-4">
      {campaigns.map((c) => (
        <CampaignCard key={c.id} campaign={c} items={itemsFor(c.id)} />
      ))}
      {unassigned.length > 0 && (
        <CampaignCard
          campaign={{ id: '', title: 'No campaign' }}
          items={unassigned}
        />
      )}
      {campaigns.length === 0 && unassigned.length === 0 && (
        <p className="text-sm text-slate-500">No campaigns yet.</p>
      )}
    </div>
  );
}

function CampaignCard({ campaign, items }: { campaign: Campaign; items: ContentItemWithVariants[] }) {
  const counts = STATUS_ORDER.map((s) => ({ status: s, n: items.filter((i) => i.status === s).length }));
  const total = items.length;

  return (
    <Card as="section" aria-label={campaign.title} className="space-y-3 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <Heading>{campaign.title}</Heading>
          {campaign.goal && <p className="text-xs text-slate-500">{campaign.goal}</p>}
        </div>
        <div className="text-right text-[11px] text-slate-500">
          {campaign.startDate && (
            <p>
              {campaign.startDate} → {campaign.endDate ?? '…'}
            </p>
          )}
          <p>{total} item{total === 1 ? '' : 's'}</p>
        </div>
      </div>

      {/* Status rollup bar. */}
      {total > 0 && (
        <div className="flex h-2 overflow-hidden rounded-full bg-surface-800" data-testid="rollup-bar">
          {counts
            .filter((c) => c.n > 0)
            .map((c) => (
              <div
                key={c.status}
                className={STATUS_COLOR[c.status]}
                style={{ width: `${(c.n / total) * 100}%` }}
                title={`${c.status}: ${c.n}`}
              />
            ))}
        </div>
      )}

      <ul className="space-y-1">
        {items.map((i) => (
          <li key={i.id} className="flex items-center gap-2 text-xs">
            <span className="text-slate-200">{i.title}</span>
            <span className="text-[11px] uppercase tracking-wide text-slate-500">{i.status}</span>
            <span className="ml-auto text-[11px] text-slate-600">{i.variants.length} variant{i.variants.length === 1 ? '' : 's'}</span>
          </li>
        ))}
        {total === 0 && <li className="text-[11px] text-slate-600">No content yet.</li>}
      </ul>
    </Card>
  );
}
