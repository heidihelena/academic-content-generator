import { useStore } from '../store/useStore';
import { getPlatformMeta } from '../lib/platforms';
import {
  averageReadingGrade,
  bestPostingDays,
  evidenceMix,
  platformBreakdown,
  postsPerWeek,
  reachByNetwork,
  scheduledVsPublished,
  sourceCoverage,
} from '../analytics/calculations';
import { BarChart, type BarDatum } from './charts/BarChart';
import { DonutChart } from './charts/DonutChart';
import { EmptyState } from './ui/States';
import { ChartIcon } from './icons';

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      {subtitle && <p className="mb-3 mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      <div className={subtitle ? '' : 'mt-3'}>{children}</div>
    </div>
  );
}

/** Analytics dashboard: posts/week, platform mix, scheduled vs published, best days. */
export function Analytics() {
  const posts = useStore((s) => s.posts);

  if (posts.length === 0) {
    return (
      <EmptyState
        icon={<ChartIcon width={28} height={28} />}
        title="No analytics yet"
        description="Create and publish posts to see performance insights here."
      />
    );
  }

  const weekly = postsPerWeek(posts);
  const platforms = platformBreakdown(posts);
  const svp = scheduledVsPublished(posts);
  const days = bestPostingDays(posts);

  const weeklyData: BarDatum[] = weekly.map((w) => ({ label: w.label, value: w.count }));

  const platformSlices = platforms.map((p) => ({
    label: getPlatformMeta(p.platform).name,
    value: p.count,
    color: getPlatformMeta(p.platform).color,
  }));

  const svpData: BarDatum[] = [
    { label: 'Scheduled', value: svp.scheduled, color: '#5fb89b' },
    { label: 'Published', value: svp.published, color: '#46a085' },
  ];

  // Highlight the best day by average engagement.
  const bestDay = [...days].sort((a, b) => b.avgEngagement - a.avgEngagement)[0];
  const dayData: BarDatum[] = days.map((d) => ({
    label: d.dayName.slice(0, 3),
    value: d.avgEngagement,
    color: bestDay && d.dayIndex === bestDay.dayIndex ? '#5fb89b' : '#46a085',
    sublabel: `${d.posts}p`,
  }));

  // Research-communication metrics.
  const evidence = evidenceMix(posts);
  const coverage = sourceCoverage(posts);
  const grade = averageReadingGrade(posts);
  const reach = reachByNetwork(posts);

  const evidenceSlices = evidence.map((e) => ({ label: e.label, value: e.count, color: e.color }));
  const reachData: BarDatum[] = reach.map((r) => ({
    label: getPlatformMeta(r.platform).name.slice(0, 3),
    value: r.impressions,
    color: getPlatformMeta(r.platform).color,
  }));
  const gradeLabel =
    grade === 0
      ? 'Not enough copy yet'
      : grade <= 9
        ? 'Accessible to a general audience'
        : grade <= 12
          ? 'High-school+ — fine for peers'
          : 'College-level — consider simplifying';

  return (
    <section aria-label="Analytics" className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Posts per week" subtitle="Volume of planned + published content by ISO week">
          <BarChart data={weeklyData} ariaLabel="Posts per week bar chart" />
        </ChartCard>

        <ChartCard title="Breakdown by platform" subtitle="Share of posts across connected channels">
          <DonutChart data={platformSlices} ariaLabel="Platform breakdown donut chart" />
        </ChartCard>

        <ChartCard title="Scheduled vs published" subtitle="Pipeline health at a glance">
          <BarChart data={svpData} ariaLabel="Scheduled versus published bar chart" />
        </ChartCard>

        <ChartCard
          title="Best posting days"
          subtitle={
            bestDay && bestDay.avgEngagement > 0
              ? `Avg engagement by day — ${bestDay.dayName} performs best`
              : 'Avg engagement by day (based on published posts)'
          }
        >
          <BarChart data={dayData} ariaLabel="Best posting days bar chart" />
        </ChartCard>
      </div>

      <div>
        <h2 className="mb-3 mt-2 text-sm font-semibold text-slate-200">Research communication</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Evidence mix" subtitle="How your posts are framed by claim strength">
            <DonutChart data={evidenceSlices} ariaLabel="Evidence mix donut chart" />
          </ChartCard>

          <div className="grid grid-cols-2 gap-4">
            <ChartCard title="Source coverage" subtitle="Claims that link a source">
              <div data-testid="source-coverage">
                <p className="text-3xl font-semibold text-slate-100">{coverage.percentage}%</p>
                <p className="mt-1 text-xs text-slate-500">
                  {coverage.linked} of {coverage.claims} evidence-based posts link a DOI/URL
                </p>
                {coverage.missing > 0 && (
                  <p className="mt-1 text-xs text-status-brief">
                    {coverage.missing} claim{coverage.missing > 1 ? 's' : ''} missing a source
                  </p>
                )}
              </div>
            </ChartCard>

            <ChartCard title="Plain-language" subtitle="Avg reading grade">
              <div data-testid="reading-grade">
                <p className="text-3xl font-semibold text-slate-100">{grade || '—'}</p>
                <p className="mt-1 text-xs text-slate-500">{gradeLabel}</p>
              </div>
            </ChartCard>
          </div>

          <ChartCard title="Reach by network" subtitle="Impressions where your audience actually is">
            <BarChart data={reachData} ariaLabel="Reach by network bar chart" />
          </ChartCard>
        </div>
      </div>
    </section>
  );
}
