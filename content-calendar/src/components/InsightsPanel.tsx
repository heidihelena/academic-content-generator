import { useEffect, useState } from 'react';
import { contentClient } from '../content/contentClient';
import { deriveInsights, type Insight, type InsightsReport } from '../insights/deriveInsights';

/**
 * "What needs attention" — derived editorial nudges (ready to schedule, scheduled
 * but not cleared, overdue, ideas without a draft, quiet week). Computed in the
 * browser from the content the dashboard already loads, so it works offline and
 * in API mode alike. Renders nothing when everything is in good shape.
 */
export function InsightsPanel() {
  const [report, setReport] = useState<InsightsReport | null>(null);

  useEffect(() => {
    let active = true;
    contentClient
      .listItems()
      .then((items) => {
        if (active) setReport(deriveInsights(items));
      })
      .catch(() => {
        if (active) setReport(null);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!report || report.insights.length === 0) return null;

  return (
    <section
      aria-label="What needs attention"
      className="rounded-lg border border-surface-800 bg-surface-900/40 p-4"
    >
      <h2 className="mb-3 text-sm font-semibold text-slate-200">What needs attention</h2>
      <ul className="space-y-2">
        {report.insights.map((insight) => (
          <InsightRow key={insight.key} insight={insight} />
        ))}
      </ul>
    </section>
  );
}

function InsightRow({ insight }: { insight: Insight }) {
  const tone =
    insight.severity === 'warn'
      ? 'bg-amber-500/15 text-amber-400'
      : 'bg-sky-500/15 text-sky-400';
  return (
    <li className="flex items-center justify-between gap-3 rounded-md bg-surface-900/60 px-3 py-2">
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>
          {insight.findings.length}
        </span>
        <span className="text-sm text-slate-200">{insight.title}</span>
      </div>
      <span className="truncate text-xs text-slate-500" title={insight.findings.map((f) => f.title).join(', ')}>
        {insight.findings
          .map((f) => f.title)
          .filter((t) => t && t !== 'Quiet week')
          .slice(0, 3)
          .join(' · ')}
      </span>
    </li>
  );
}
