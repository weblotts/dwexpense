import type { BucketWithSpend } from '@dwexpense/types';
import { money } from '../lib/format';
import { progressColor, progressPct } from '../lib/progress';

export function SummaryBar({ buckets }: { buckets: BucketWithSpend[] }) {
  const totalLimit = buckets.reduce((s, b) => s + b.monthlyLimit, 0);
  const totalSpent = buckets.reduce((s, b) => s + b.spent, 0);
  const over = totalSpent > totalLimit;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400">This month</h2>
        <span className={`text-sm font-semibold ${over ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
          {over ? 'Over budget' : `${money(totalLimit - totalSpent)} left`}
        </span>
      </div>
      <p className="mb-3 text-lg font-semibold">
        Spent <span className="text-slate-900 dark:text-white">{money(totalSpent)}</span> of{' '}
        {money(totalLimit)}
      </p>
      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${progressPct(totalSpent, totalLimit)}%`,
            backgroundColor: progressColor(totalSpent, totalLimit),
          }}
        />
      </div>
    </div>
  );
}
