export interface BarDatum {
  label: string;
  value: number;
  /** Optional bar color (hex). Falls back to the brand color. */
  color?: string;
  /** Optional secondary line under the label (e.g. an engagement figure). */
  sublabel?: string;
}

interface BarChartProps {
  data: BarDatum[];
  height?: number;
  ariaLabel: string;
}

/**
 * Minimal, dependency-free horizontal-baseline bar chart rendered with flexbox.
 * Heights are computed from the max value so the tallest bar fills the chart.
 */
export function BarChart({ data, height = 160, ariaLabel }: BarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div role="img" aria-label={ariaLabel} className="flex items-end gap-2" style={{ height }}>
      {data.map((d) => {
        const pct = (d.value / max) * 100;
        return (
          <div key={d.label} className="flex flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[11px] font-medium text-slate-300">{d.value}</span>
            <div
              className="w-full rounded-t-md transition-all"
              style={{
                height: `${Math.max(2, pct)}%`,
                backgroundColor: d.color ?? '#6366f1',
                minHeight: d.value > 0 ? 4 : 2,
                opacity: d.value > 0 ? 1 : 0.3,
              }}
              title={`${d.label}: ${d.value}`}
            />
            <span className="text-[10px] text-slate-500">{d.label}</span>
            {d.sublabel && <span className="text-[9px] text-slate-600">{d.sublabel}</span>}
          </div>
        );
      })}
    </div>
  );
}
