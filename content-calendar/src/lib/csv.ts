import {
  exportBlockers,
  type ContentItemWithVariants,
} from '../content/contentTypes';

/**
 * CSV export of the content plan (the ContentItem/Variant model). Academics need
 * a spreadsheet for reporting — grant deliverables, comms audits, hand-off. One
 * row per variant (an idea with no variant yet still gets a row so nothing is
 * silently dropped). RFC 4180 quoting.
 */

const COLUMNS = [
  'Title',
  'Channel',
  'Format',
  'Status',
  'Audience',
  'Pillar',
  'Evidence',
  'Claim risk',
  'Scheduled at',
  'Cleared',
  'Campaign',
  'Owner',
] as const;

/** Quote a field per RFC 4180 when it contains a comma, quote or newline. */
function escapeCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function row(cells: (string | undefined)[]): string {
  return cells.map((c) => escapeCell(c ?? '')).join(',');
}

export function buildContentCsv(items: ContentItemWithVariants[]): string {
  const lines = [row([...COLUMNS])];
  for (const item of items) {
    const base = {
      title: item.title,
      audience: item.audience,
      pillar: item.pillar,
      evidence: item.evidenceLevel,
      claimRisk: item.claimRisk,
      campaign: item.campaignId,
      owner: item.ownerId,
    };
    if (item.variants.length === 0) {
      lines.push(
        row([base.title, '', '', item.status, base.audience, base.pillar, base.evidence, base.claimRisk, '', '', base.campaign, base.owner]),
      );
      continue;
    }
    for (const v of item.variants) {
      lines.push(
        row([
          base.title,
          v.channel,
          v.format,
          v.status,
          base.audience,
          base.pillar,
          base.evidence,
          base.claimRisk,
          v.scheduledAt,
          exportBlockers(v).length === 0 ? 'yes' : 'no',
          base.campaign,
          base.owner,
        ]),
      );
    }
  }
  return lines.join('\r\n');
}

/** Trigger a browser download of the content plan as a .csv. No-ops outside a DOM. */
export function downloadContentCsv(
  items: ContentItemWithVariants[],
  filename = 'content-plan.csv',
): string {
  const csv = buildContentCsv(items);
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') return csv;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return csv;
}
