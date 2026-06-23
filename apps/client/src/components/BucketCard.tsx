import type { BucketWithSpend } from '@dwexpense/types';
import { money } from '../lib/format';
import { ProgressBar } from './ProgressBar';

export function BucketCard({ bucket }: { bucket: BucketWithSpend }) {
  const over = bucket.remaining < 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-3 flex items-center gap-2 font-semibold">
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: bucket.color }} />
        {bucket.name}
      </div>

      <ProgressBar spent={bucket.spent} limit={bucket.monthlyLimit} />

      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-slate-500 dark:text-slate-400">
          {money(bucket.spent)} / {money(bucket.monthlyLimit)}
        </span>
        <span className={over ? 'font-semibold text-red-500' : 'font-medium text-slate-700 dark:text-slate-300'}>
          {over ? `${money(-bucket.remaining)} over` : `${money(bucket.remaining)} left`}
        </span>
      </div>
    </div>
  );
}
