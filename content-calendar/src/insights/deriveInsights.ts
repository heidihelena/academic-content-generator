import {
  exportBlockers,
  type ContentItemWithVariants,
  type ContentVariant,
} from '../content/contentTypes';

/**
 * Derived editorial "intelligence" checks, computed in the browser from the
 * content the dashboard already loads (so it works in local and API mode alike).
 * Mirrors the backend GET /api/insights checks — the same nudges, no extra fetch.
 */
export type InsightSeverity = 'info' | 'warn';

export interface InsightFinding {
  itemId: string;
  variantId?: string;
  title: string;
  channel?: string;
  detail: string;
}

export interface Insight {
  key: string;
  title: string;
  severity: InsightSeverity;
  findings: InsightFinding[];
}

export interface InsightsReport {
  counts: { items: number; variants: number; scheduledThisWeek: number };
  insights: Insight[];
}

/** Monday 00:00 UTC of the week containing `now`. */
function startOfWeek(now: Date): number {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const offset = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  d.setUTCDate(d.getUTCDate() - offset);
  return d.getTime();
}

export function deriveInsights(
  items: ContentItemWithVariants[],
  now: Date = new Date(),
): InsightsReport {
  const weekStart = startOfWeek(now);
  const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000;
  const inThisWeek = (iso?: string) => {
    if (!iso) return false;
    const t = Date.parse(iso);
    return t >= weekStart && t < weekEnd;
  };

  const finding = (item: ContentItemWithVariants, v: ContentVariant | undefined, detail: string): InsightFinding => ({
    itemId: item.id,
    variantId: v?.id,
    title: item.title,
    channel: v?.channel,
    detail,
  });

  const ideasWithoutDraft: InsightFinding[] = [];
  const readyToSchedule: InsightFinding[] = [];
  const scheduledNotCleared: InsightFinding[] = [];
  const overdue: InsightFinding[] = [];
  const draftsAwaitingReview: InsightFinding[] = [];
  let variantCount = 0;
  let scheduledThisWeek = 0;

  for (const item of items) {
    if (item.variants.length === 0) {
      ideasWithoutDraft.push(finding(item, undefined, 'No channel variant drafted.'));
    }
    for (const v of item.variants) {
      variantCount++;
      const blockers = exportBlockers(v);
      const cleared = blockers.length === 0;
      if (inThisWeek(v.scheduledAt)) scheduledThisWeek++;

      if (cleared && !v.scheduledAt && v.status !== 'exported') {
        readyToSchedule.push(finding(item, v, 'Cleared for export but not scheduled.'));
      }
      if (v.scheduledAt && !cleared) {
        scheduledNotCleared.push(finding(item, v, blockers.join(' ')));
      }
      if (v.scheduledAt && v.status !== 'exported' && Date.parse(v.scheduledAt) < now.getTime()) {
        overdue.push(finding(item, v, `Scheduled for ${v.scheduledAt} but not yet published.`));
      }
      if (v.status === 'draft' && !v.safetyReview) {
        draftsAwaitingReview.push(finding(item, v, 'Draft has not been safety-reviewed.'));
      }
    }
  }

  const insights: Insight[] = [];
  const push = (key: string, title: string, severity: InsightSeverity, findings: InsightFinding[]) => {
    if (findings.length) insights.push({ key, title, severity, findings });
  };
  push('ideas-without-draft', 'Ideas with no draft yet', 'info', ideasWithoutDraft);
  push('reviewed-unscheduled', 'Ready to schedule', 'info', readyToSchedule);
  push('scheduled-not-cleared', 'Scheduled but not cleared to ship', 'warn', scheduledNotCleared);
  push('overdue-unpublished', 'Past due and still unpublished', 'warn', overdue);
  push('drafts-awaiting-review', 'Drafts awaiting safety review', 'info', draftsAwaitingReview);
  if (variantCount > 0 && scheduledThisWeek === 0) {
    insights.push({
      key: 'quiet-week',
      title: 'Nothing scheduled this week',
      severity: 'info',
      findings: [{ itemId: '', title: 'Quiet week', detail: 'No variants are scheduled this week.' }],
    });
  }

  return {
    counts: { items: items.length, variants: variantCount, scheduledThisWeek },
    insights,
  };
}
