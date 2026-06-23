import { useState } from 'react';
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp, PiggyBank, Wallet, ArrowUpDown, Printer } from 'lucide-react';
import { useSummary, useSummaryMonths } from '../hooks/useSummary';
import { useQueries } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { MonthlySummary } from '@dwexpense/types';
import { SpendPaceChart } from '../components/SpendPaceChart';
import { SpendingDonut } from '../components/SpendingDonut';
import { Skeleton } from '../components/Skeleton';
import { money } from '../lib/format';

function fmt(month: string | undefined) {
  if (!month) return '—';
  const [y, m] = month.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });
}

function useSixMonthTrend(months: string[] | undefined) {
  const sixMonths = months?.slice(0, 6) ?? [];
  const results = useQueries({
    queries: sixMonths.map((m) => ({
      queryKey: ['summary', m],
      queryFn: async () => {
        const { data } = await api.get<MonthlySummary>('/summary', { params: { month: m } });
        return data;
      },
    })),
  });
  return sixMonths.map((m, i) => ({ month: m, data: results[i].data }));
}

function monthAbbr(month: string | undefined) {
  if (!month) return '';
  const [y, mo] = month.split('-');
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleString(undefined, { month: 'short' });
}

export function Reports() {
  const { data: months, isLoading: monthsLoading } = useSummaryMonths();
  const [idx, setIdx] = useState(0); // 0 = most recent

  const month = months?.[idx];
  const compareIdx = idx + 1;
  const compareMonth = months?.[compareIdx];

  const { data: summary, isLoading: summaryLoading, isFetching: summaryFetching } = useSummary(month);
  const { data: compareSummary } = useSummary(compareMonth);

  const trendData = useSixMonthTrend(months);

  // Show skeleton only on true first load (no data at all yet)
  const isLoading = monthsLoading || (summaryLoading && !summary);
  const isTransitioning = summaryFetching && !!summary;
  const canGoBack = months ? idx < months.length - 1 : false;
  const canGoForward = idx > 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-base-content">Reports</h1>
          <p className="text-sm text-base-content/50">Monthly breakdown &amp; comparisons</p>
        </div>
        <button
          onClick={() => window.print()}
          className="no-print flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition hover:opacity-80"
          style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
        >
          <Printer size={13} />
          Print / Save PDF
        </button>
      </div>

      {/* Month picker */}
      <div className="flex items-center justify-between rounded-xl px-4 py-3"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <button
          onClick={() => setIdx((i) => i + 1)}
          disabled={!canGoBack}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-base-200 disabled:opacity-30"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-base-content">{month ? fmt(month) : '—'}</p>
          {isTransitioning
            ? <p className="text-xs" style={{ color: 'var(--color-primary)' }}>Loading…</p>
            : idx === 0 && <p className="text-xs text-base-content/40">Current month</p>}
        </div>
        <button
          onClick={() => setIdx((i) => i - 1)}
          disabled={!canGoForward}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-base-200 disabled:opacity-30"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
          </div>
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      )}

      {!isLoading && !summary && (
        <div className="rounded-2xl border border-dashed p-12 text-center"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-faint)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>No data yet</p>
          <p className="mt-1 text-xs">Log an expense or income entry to see your report.</p>
        </div>
      )}

      {summary && !isLoading && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Income" value={money(summary.totalIncome)} icon={Wallet}
              delta={compareSummary ? summary.totalIncome - compareSummary.totalIncome : undefined} />
            <StatCard label="Spent" value={money(summary.totalSpent)} icon={TrendingDown}
              delta={compareSummary ? summary.totalSpent - compareSummary.totalSpent : undefined} invertDelta />
            <StatCard label="Saved" value={money(summary.totalIncome - summary.totalSpent)} icon={PiggyBank}
              delta={compareSummary ? (summary.totalIncome - summary.totalSpent) - (compareSummary.totalIncome - compareSummary.totalSpent) : undefined} />
            <StatCard label="vs goal" value={money(summary.projectedSavings - summary.savingsGoal)} icon={TrendingUp}
              delta={compareSummary ? (summary.projectedSavings - summary.savingsGoal) - (compareSummary.projectedSavings - compareSummary.savingsGoal) : undefined} />
          </div>

          {/* Comparison bar — only when a previous month exists */}
          {compareSummary && (
            <div className="print-page rounded-xl p-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div className="mb-3 flex items-center gap-2">
                <ArrowUpDown size={13} style={{ color: 'var(--color-text-muted)' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                  vs {fmt(compareMonth!)}
                </span>
              </div>
              <div className="space-y-2.5">
                {[
                  { label: 'Income',  a: summary.totalIncome, b: compareSummary.totalIncome },
                  { label: 'Spent',   a: summary.totalSpent,  b: compareSummary.totalSpent },
                  { label: 'Savings', a: summary.totalIncome - summary.totalSpent, b: compareSummary.totalIncome - compareSummary.totalSpent },
                ].map(({ label, a, b }) => {
                  const max = Math.max(a, b, 1);
                  return (
                    <div key={label}>
                      <div className="mb-1 flex justify-between text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        <span>{label}</span>
                        <span className="font-medium" style={{ color: 'var(--color-text)' }}>{money(a)}</span>
                      </div>
                      <div className="flex gap-1">
                        <div className="flex h-2 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--color-surface-2)' }}>
                          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${(a / max) * 100}%` }} />
                        </div>
                        <div className="flex h-2 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--color-surface-2)' }}>
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(b / max) * 100}%`, backgroundColor: 'var(--color-border)' }} />
                        </div>
                      </div>
                      <div className="mt-0.5 flex justify-end text-xs" style={{ color: 'var(--color-text-faint)' }}>
                        {fmt(compareMonth!).split(' ')[0]}: {money(b)}
                      </div>
                    </div>
                  );
                })}
                <div className="mt-1 flex items-center gap-3 text-xs" style={{ color: 'var(--color-text-faint)' }}>
                  <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-4 rounded-full bg-primary" /> {fmt(month!)}</span>
                  <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-4 rounded-full" style={{ backgroundColor: 'var(--color-border)' }} /> {fmt(compareMonth!)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Category breakdown */}
          {summary.topCategories.length > 0 && (
            <div className="print-page rounded-xl p-5" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <h2 className="mb-4 text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Spending by category</h2>
              <div className="space-y-3">
                {summary.topCategories.map((cat) => {
                  const pct = summary.totalSpent > 0 ? (cat.spent / summary.totalSpent) * 100 : 0;
                  const prevCat = compareSummary?.topCategories.find((c) => c.name === cat.name);
                  return (
                    <div key={cat.name}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                          <span style={{ color: 'var(--color-text)' }}>{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {prevCat && (
                            <span style={{ color: cat.spent > prevCat.spent ? 'var(--color-error)' : 'var(--color-success)' }}>
                              {cat.spent > prevCat.spent ? '+' : ''}{money(cat.spent - prevCat.spent)}
                            </span>
                          )}
                          <span className="font-medium" style={{ color: 'var(--color-text)' }}>{money(cat.spent)}</span>
                          <span style={{ color: 'var(--color-text-faint)' }}>{pct.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--color-surface-2)' }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="print-page rounded-xl p-5" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <h2 className="mb-4 text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Spend pace</h2>
              <SpendPaceChart summary={summary} />
            </div>
            <div className="print-page rounded-xl p-5" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <h2 className="mb-4 text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Breakdown</h2>
              <SpendingDonut summary={summary} />
            </div>
          </div>

          {/* 6-month income vs expense trend */}
          {trendData.filter((t) => t.data).length >= 2 && (
            <SixMonthTrend trendData={trendData} />
          )}

          {/* Month list for quick jump */}
          {months && months.length > 1 && (
            <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-faint)' }}>All months</p>
              <div className="flex flex-wrap gap-2">
                {months.map((m, i) => (
                  <button key={m} onClick={() => setIdx(i)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium transition"
                    style={{
                      backgroundColor: i === idx ? 'var(--color-primary)' : 'var(--color-surface-2)',
                      color: i === idx ? 'var(--color-primary-fg)' : 'var(--color-text-muted)',
                    }}>
                    {fmt(m)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SixMonthTrend({ trendData }: { trendData: { month: string; data: MonthlySummary | undefined }[] }) {
  const loaded = trendData.filter((t) => t.data);
  const maxVal = Math.max(...loaded.flatMap((t) => [t.data!.totalIncome, t.data!.totalSpent]), 1);
  // reverse so oldest month is on left
  const ordered = [...trendData].reverse();

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>6-month trend</h2>
        <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#10b981' }} />
            Income
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#ef4444' }} />
            Spent
          </span>
        </div>
      </div>
      <div className="flex items-end gap-2" style={{ height: '120px' }}>
        {ordered.map(({ month, data }) => {
          if (!data) return (
            <div key={month} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex w-full items-end justify-center gap-1" style={{ height: '96px' }}>
                <div className="flex-1 rounded-t" style={{ height: '4px', backgroundColor: 'var(--color-surface-2)' }} />
                <div className="flex-1 rounded-t" style={{ height: '4px', backgroundColor: 'var(--color-surface-2)' }} />
              </div>
              <span className="text-[10px]" style={{ color: 'var(--color-text-faint)' }}>{monthAbbr(month)}</span>
            </div>
          );
          const incomePct = (data.totalIncome / maxVal) * 96;
          const spentPct = (data.totalSpent / maxVal) * 96;
          return (
            <div key={month} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex w-full items-end justify-center gap-1" style={{ height: '96px' }}>
                <div className="flex-1 rounded-t transition-all duration-500" style={{ height: `${Math.max(2, incomePct)}px`, backgroundColor: '#10b981' }} />
                <div className="flex-1 rounded-t transition-all duration-500" style={{ height: `${Math.max(2, spentPct)}px`, backgroundColor: '#ef4444' }} />
              </div>
              <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{monthAbbr(month)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, delta, invertDelta }: {
  label: string; value: string; icon: typeof Wallet;
  delta?: number; invertDelta?: boolean;
}) {
  const good = invertDelta ? (delta ?? 0) <= 0 : (delta ?? 0) >= 0;
  const deltaColor = delta === undefined ? undefined : good ? 'var(--color-success)' : 'var(--color-error)';
  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
        <Icon size={13} style={{ color: 'var(--color-text-faint)' }} />
      </div>
      <div className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{value}</div>
      {delta !== undefined && (
        <div className="mt-0.5 text-xs font-medium" style={{ color: deltaColor }}>
          {delta >= 0 ? '+' : ''}{money(delta)} vs prev
        </div>
      )}
    </div>
  );
}
