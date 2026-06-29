import { useEffect, useState } from 'react';
import type { ContentItemWithVariants, ContentVariant } from '../../content/contentTypes';
import { contentClient } from '../../content/contentClient';
import { downloadContentIcs } from '../../lib/ics';
import { downloadContentCsv } from '../../lib/csv';

export type ContentView = 'list' | 'board' | 'table';

/**
 * Owns the Content view: loading items + campaigns, the open variant, the view
 * mode, and the in-place variant edits/additions. Pure logic.
 */
export function useContentItems() {
  const [items, setItems] = useState<ContentItemWithVariants[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [mode, setMode] = useState<ContentView>('list');
  const [campaigns, setCampaigns] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    contentClient
      .listCampaigns()
      .then((cs) => setCampaigns(new Map(cs.map((c) => [c.id, c.title]))))
      .catch(() => setCampaigns(new Map()));
  }, []);

  const load = () => {
    setLoading(true);
    setError(null);
    contentClient
      .listItems()
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load content.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const replaceVariant = (next: ContentVariant) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === next.contentItemId
          ? { ...item, variants: item.variants.map((v) => (v.id === next.id ? next : v)) }
          : item,
      ),
    );
    setRefresh((n) => n + 1); // re-fetch the agenda (schedule/publish may have changed)
  };

  const addVariant = (next: ContentVariant) => {
    setItems((prev) =>
      prev.map((item) => (item.id === next.contentItemId ? { ...item, variants: [...item.variants, next] } : item)),
    );
    setOpenId(next.id); // open the new variant for editing
  };

  const open = items
    .flatMap((i) => i.variants.map((v) => ({ item: i, variant: v })))
    .find((p) => p.variant.id === openId);

  const exportCsv = () => downloadContentCsv(items);
  const exportIcs = async () => downloadContentIcs(await contentClient.calendarFeed());

  return {
    items,
    loading,
    error,
    openId,
    setOpenId,
    refresh,
    mode,
    setMode,
    campaigns,
    open,
    load,
    replaceVariant,
    addVariant,
    exportCsv,
    exportIcs,
  };
}
