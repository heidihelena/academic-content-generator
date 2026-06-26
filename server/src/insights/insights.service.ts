import { Injectable } from '@nestjs/common';
import { ContentItem, ContentVariant, exportBlockers } from '../domain/academic';
import { ContentService } from '../content/content.service';

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
  generatedAt: string;
  /** Monday (UTC) of the week the report is computed for. */
  weekOf: string;
  counts: { items: number; variants: number; scheduledThisWeek: number };
  insights: Insight[];
}

/** Monday 00:00 UTC of the week containing `now`. */
function startOfWeek(now: Date): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const offset = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  d.setUTCDate(d.getUTCDate() - offset);
  return d;
}

/**
 * Derived editorial checks — the cheap, high-value nudges the dashboard surfaces
 * ("ready to schedule", "scheduled but can't ship", "ideas with no draft",
 * "quiet week"). Pure functions of the current user's content; no new storage.
 * Scoped per user via {@link ContentService}.
 */
@Injectable()
export class InsightsService {
  constructor(private readonly content: ContentService) {}

  async report(scope?: string, now: Date = new Date()): Promise<InsightsReport> {
    const items = await this.content.listItems({}, scope);
    const variantsByItem = new Map<string, ContentVariant[]>();
    let variantCount = 0;
    for (const item of items) {
      const variants = await this.content.listVariants(item.id, scope);
      variantsByItem.set(item.id, variants);
      variantCount += variants.length;
    }

    const weekStart = startOfWeek(now);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
    const inThisWeek = (iso?: string): boolean => {
      if (!iso) return false;
      const t = Date.parse(iso);
      return t >= weekStart.getTime() && t < weekEnd.getTime();
    };

    const titleOf = (item: ContentItem) => item.title;
    const insights: Insight[] = [];
    const push = (key: string, title: string, severity: InsightSeverity, findings: InsightFinding[]) => {
      if (findings.length) insights.push({ key, title, severity, findings });
    };

    // 1. Ideas with no variant drafted yet.
    push(
      'ideas-without-draft',
      'Ideas with no draft yet',
      'info',
      items
        .filter((i) => (variantsByItem.get(i.id) ?? []).length === 0)
        .map((i) => ({ itemId: i.id, title: titleOf(i), detail: 'No channel variant drafted.' })),
    );

    let scheduledThisWeek = 0;
    const readyToSchedule: InsightFinding[] = [];
    const scheduledNotCleared: InsightFinding[] = [];
    const overdue: InsightFinding[] = [];
    const draftsAwaitingReview: InsightFinding[] = [];

    for (const item of items) {
      for (const v of variantsByItem.get(item.id) ?? []) {
        const blockers = exportBlockers(v);
        const cleared = blockers.length === 0;
        if (inThisWeek(v.scheduledAt)) scheduledThisWeek++;

        if (cleared && !v.scheduledAt && v.status !== 'exported') {
          readyToSchedule.push({
            itemId: item.id,
            variantId: v.id,
            title: titleOf(item),
            channel: v.channel,
            detail: 'Cleared for export but not scheduled.',
          });
        }
        if (v.scheduledAt && !cleared) {
          scheduledNotCleared.push({
            itemId: item.id,
            variantId: v.id,
            title: titleOf(item),
            channel: v.channel,
            detail: blockers.join(' '),
          });
        }
        if (v.scheduledAt && v.status !== 'exported' && Date.parse(v.scheduledAt) < now.getTime()) {
          overdue.push({
            itemId: item.id,
            variantId: v.id,
            title: titleOf(item),
            channel: v.channel,
            detail: `Scheduled for ${v.scheduledAt} but not yet published.`,
          });
        }
        if (v.status === 'draft' && !v.safetyReview) {
          draftsAwaitingReview.push({
            itemId: item.id,
            variantId: v.id,
            title: titleOf(item),
            channel: v.channel,
            detail: 'Draft has not been safety-reviewed.',
          });
        }
      }
    }

    push('reviewed-unscheduled', 'Ready to schedule', 'info', readyToSchedule);
    push('scheduled-not-cleared', 'Scheduled but not cleared to ship', 'warn', scheduledNotCleared);
    push('overdue-unpublished', 'Past due and still unpublished', 'warn', overdue);
    push('drafts-awaiting-review', 'Drafts awaiting safety review', 'info', draftsAwaitingReview);

    // Quiet-week nudge: content exists but nothing is going out this week.
    if (variantCount > 0 && scheduledThisWeek === 0) {
      insights.push({
        key: 'quiet-week',
        title: 'Nothing scheduled this week',
        severity: 'info',
        findings: [{ itemId: '', title: 'Quiet week', detail: 'No variants are scheduled this week.' }],
      });
    }

    return {
      generatedAt: now.toISOString(),
      weekOf: weekStart.toISOString().slice(0, 10),
      counts: { items: items.length, variants: variantCount, scheduledThisWeek },
      insights,
    };
  }
}
