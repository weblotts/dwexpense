import { useMemo } from 'react';
import type { BucketWithSpend, Expense } from '@dwexpense/types';
import { money, dayLabel } from '../lib/format';
import { useDeleteExpense } from '../hooks/useDeleteExpense';
import { Skeleton } from './Skeleton';

interface Props {
  expenses: Expense[];
  buckets: BucketWithSpend[];
  loading?: boolean;
  /** Hide the per-row bucket tag (e.g. on a single-bucket page). */
  hideBucket?: boolean;
}

export function ExpenseList({ expenses, buckets, loading, hideBucket }: Props) {
  const del = useDeleteExpense();
  const bucketMap = useMemo(() => new Map(buckets.map((b) => [b._id, b])), [buckets]);

  // Group by calendar day (expenses already arrive date-desc).
  const groups = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of expenses) {
      const key = e.date.slice(0, 10);
      (map.get(key) ?? map.set(key, []).get(key)!).push(e);
    }
    return [...map.entries()];
  }, [expenses]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-400 dark:border-slate-700">
        No expenses logged yet — add your first one above.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map(([day, items]) => (
        <div key={day}>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {dayLabel(day)}
          </h4>
          <ul className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            {items.map((e) => {
              const bucket = bucketMap.get(e.bucketId);
              return (
                <li
                  key={e._id}
                  className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 last:border-0 dark:border-slate-800"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {!hideBucket && bucket && (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: `${bucket.color}22`, color: bucket.color }}
                        >
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: bucket.color }} />
                          {bucket.name}
                        </span>
                      )}
                      <span className="truncate text-sm text-slate-600 dark:text-slate-300">
                        {e.note || '—'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{money(e.amount)}</span>
                    <button
                      aria-label="Delete expense"
                      onClick={() => del.mutate(e._id)}
                      className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                      </svg>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
