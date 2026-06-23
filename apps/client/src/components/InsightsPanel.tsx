import type { MonthlySummary } from '@dwexpense/types';
import { money } from '../lib/format';

export function InsightsPanel({ summary }: { summary: MonthlySummary }) {
  const { topCategories, prevMonthSpent, totalSpent, onTrack, totalIncome, projectedSavings } = summary;

  const delta = totalSpent - prevMonthSpent;
  const deltaPct = prevMonthSpent > 0 ? Math.round((delta / prevMonthSpent) * 100) : null;
  const maxTop = topCategories[0]?.spent ?? 1;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2 className="mb-4 text-sm font-medium text-slate-500">Insights</h2>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <Tile
          label="Pace"
          value={totalIncome > 0 ? (onTrack ? 'On track' : 'Overspending') : '—'}
          tone={totalIncome > 0 ? (onTrack ? 'good' : 'bad') : 'neutral'}
        />
        <Tile
          label="Projected savings"
          value={money(projectedSavings)}
          tone={projectedSavings >= 0 ? 'good' : 'bad'}
        />
        <Tile
          label="vs last month"
          value={
            deltaPct === null
              ? money(totalSpent)
              : `${delta >= 0 ? '+' : ''}${deltaPct}%`
          }
          tone={delta > 0 ? 'bad' : 'good'}
        />
        <Tile label="Last month spent" value={money(prevMonthSpent)} tone="neutral" />
      </div>

      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Top categories
      </h3>
      {topCategories.length === 0 ? (
        <p className="text-sm text-slate-400">No spending yet this month.</p>
      ) : (
        <div className="space-y-2">
          {topCategories.map((c) => (
            <div key={c.name}>
              <div className="mb-0.5 flex justify-between text-sm">
                <span>{c.name}</span>
                <span className="font-medium">{money(c.spent)}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(c.spent / maxTop) * 100}%`, backgroundColor: c.color }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'good' | 'bad' | 'neutral';
}) {
  const color =
    tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-red-500' : 'text-slate-700 dark:text-slate-200';
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}
