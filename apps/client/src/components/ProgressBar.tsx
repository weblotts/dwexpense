import { progressColor, progressPct } from '../lib/progress';

export function ProgressBar({ spent, limit }: { spent: number; limit: number }) {
  const pct = progressPct(spent, limit);
  const color = progressColor(spent, limit);
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
      <div
        className="h-full rounded-full transition-all duration-500 ease-out"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}
