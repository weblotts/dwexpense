import { useQuery } from '@tanstack/react-query';
import { X, TrendingDown, Receipt } from 'lucide-react';
import { api } from '../lib/api';
import { money, currentMonth, parseLocalDate } from '../lib/format';
import type { BucketWithSpend } from '@dwexpense/types';
import type { Expense } from '@dwexpense/types';

interface Props {
  bucket: BucketWithSpend;
  onClose: () => void;
}

export function BucketDrilldown({ bucket, onClose }: Props) {
  const month = currentMonth();

  const { data: expenses, isLoading } = useQuery<Expense[]>({
    queryKey: ['expenses', bucket._id, month],
    queryFn: async () => {
      const { data } = await api.get('/expenses', { params: { bucketId: bucket._id, month } });
      return data;
    },
    staleTime: 30_000,
  });

  const hasLimit = bucket.monthlyLimit > 0;
  const pct = hasLimit ? Math.min((bucket.spent / bucket.monthlyLimit) * 100, 100) : 0;
  const over = hasLimit && bucket.spent > bucket.monthlyLimit;
  const remaining = hasLimit ? bucket.monthlyLimit - bucket.spent : 0;

  // Group by date
  const grouped = groupByDate(expenses ?? []);

  // Biggest single item
  const biggest = expenses?.reduce<Expense | null>(
    (max, e) => (!max || e.amount > max.amount ? e : max), null
  );

  // Average per transaction
  const avg = expenses && expenses.length > 0 ? bucket.spent / expenses.length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full sm:max-w-md max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ backgroundColor: bucket.color + '22' }}>
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: bucket.color }} />
            </span>
            <div>
              <h2 className="font-semibold" style={{ color: 'var(--color-text)' }}>{bucket.name}</h2>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {new Date().toLocaleString(undefined, { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:opacity-70"
            style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
            <X size={15} />
          </button>
        </div>

        {/* Summary strip */}
        <div className="flex-shrink-0 px-5 py-4 space-y-3"
          style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-2)' }}>
          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="font-bold" style={{ color: over ? 'var(--color-error)' : 'var(--color-text)' }}>
                {money(bucket.spent)}
              </span>
              {hasLimit && (
                <span style={{ color: 'var(--color-text-muted)' }}>
                  {over
                    ? <span style={{ color: 'var(--color-error)' }}>{money(bucket.spent - bucket.monthlyLimit)} over budget</span>
                    : <>{money(remaining)} remaining</>}
                </span>
              )}
            </div>
            {hasLimit && (
              <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--color-border)' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: over ? 'var(--color-error)' : bucket.color }} />
              </div>
            )}
            {hasLimit && (
              <p className="mt-1 text-xs text-right" style={{ color: 'var(--color-text-faint)' }}>
                {Math.round(pct)}% of {money(bucket.monthlyLimit)} budget
              </p>
            )}
          </div>

          {/* Stat pills */}
          <div className="grid grid-cols-3 gap-2">
            <StatPill label="Transactions" value={String(expenses?.length ?? '—')} />
            <StatPill label="Avg. per entry" value={avg > 0 ? money(avg) : '—'} />
            <StatPill label="Largest" value={biggest ? money(biggest.amount) : '—'} />
          </div>
        </div>

        {/* Expense list */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {isLoading && (
            <div className="space-y-2 py-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--color-surface-2)' }} />
              ))}
            </div>
          )}

          {!isLoading && expenses?.length === 0 && (
            <div className="py-10 text-center">
              <Receipt size={28} className="mx-auto mb-2" style={{ color: 'var(--color-text-faint)' }} />
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No expenses this month</p>
            </div>
          )}

          {!isLoading && grouped.map(({ date, items, total }) => (
            <div key={date} className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-faint)' }}>
                  {formatDate(date)}
                </p>
                <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{money(total)}</p>
              </div>
              <div className="space-y-1">
                {items.map((e) => (
                  <div key={e._id} className="flex items-center justify-between rounded-xl px-3 py-2.5"
                    style={{ backgroundColor: 'var(--color-surface-2)' }}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: bucket.color + '22', color: bucket.color }}>
                        <TrendingDown size={13} />
                      </span>
                      <span className="truncate text-sm" style={{ color: 'var(--color-text)' }}>
                        {e.note || 'Expense'}
                      </span>
                    </div>
                    <span className="ml-3 flex-shrink-0 text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                      {money(e.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl p-2.5 text-center" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>{label}</p>
      <p className="mt-0.5 text-sm font-bold" style={{ color: 'var(--color-text)' }}>{value}</p>
    </div>
  );
}

function groupByDate(expenses: Expense[]) {
  const map = new Map<string, { items: Expense[]; total: number }>();
  for (const e of expenses) {
    const key = e.date.slice(0, 10);
    const group = map.get(key) ?? { items: [], total: 0 };
    group.items.push(e);
    group.total += e.amount;
    map.set(key, group);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, g]) => ({ date, ...g }));
}

function formatDate(iso: string) {
  const d = parseLocalDate(iso);
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const yest = new Date(today); yest.setDate(today.getDate() - 1);
  const yestKey = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`;
  if (iso.slice(0, 10) === todayKey) return 'Today';
  if (iso.slice(0, 10) === yestKey) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
