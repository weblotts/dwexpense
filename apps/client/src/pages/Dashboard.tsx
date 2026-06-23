import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Calendar, CheckCircle2, AlertTriangle, BarChart2, Plus, Zap } from 'lucide-react';
import { useBuckets } from '../hooks/useBuckets';
import { useSummary } from '../hooks/useSummary';
import { AlertsBanner } from '../components/AlertsBanner';
import { BucketBars } from '../components/BucketBars';
import { BucketDrilldown } from '../components/BucketDrilldown';
import { ExpenseModal } from '../components/ExpenseModal';
import { AddIncomeModal } from '../components/AddIncomeModal';
import { SplitExpenseModal } from '../components/SplitExpenseModal';
import { Skeleton } from '../components/Skeleton';
import { money } from '../lib/format';
import type { BucketWithSpend } from '@dwexpense/types';

export function Dashboard() {
  const { data: buckets, isLoading, isError } = useBuckets();
  const { data: summary } = useSummary();
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [drillBucket, setDrillBucket] = useState<BucketWithSpend | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === 'e' || e.key === 'E') setShowExpenseModal(true);
      if (e.key === 'i' || e.key === 'I') setShowIncomeModal(true);
      if (e.key === 's' || e.key === 'S') setShowSplitModal(true);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (isLoading) return <DashboardSkeleton />;

  if (isError || !buckets) {
    return (
      <div className="rounded-2xl p-5 text-sm" style={{ backgroundColor: 'rgba(220,38,38,0.08)', color: 'var(--color-error)', border: '1px solid rgba(220,38,38,0.2)' }}>
        Could not load your data. Is the server running?
      </div>
    );
  }

  const hasSummary = !!summary && summary.totalIncome > 0;
  const budgetLimit = summary
    ? (summary.totalAllocated > 0 ? summary.totalAllocated : summary.totalIncome - summary.savingsGoal)
    : 0;
  const spentPct = budgetLimit > 0 ? Math.min(100, (summary!.totalSpent / budgetLimit) * 100) : 0;
  const daysLeft = hasSummary ? summary!.daysInMonth - summary!.dayOfMonth : 0;
  const dailyBudget = hasSummary && summary!.available > 0 ? summary!.available / Math.max(1, daysLeft) : 0;
  const barColor = spentPct >= 100 ? '#f87171' : spentPct >= 75 ? '#fbbf24' : '#34d399';

  return (
    <div className="space-y-4">
      {/* Modals */}
      {showExpenseModal && buckets.length > 0 && (
        <ExpenseModal buckets={buckets} onClose={() => setShowExpenseModal(false)} />
      )}
      {showIncomeModal && <AddIncomeModal onClose={() => setShowIncomeModal(false)} />}
      {showSplitModal && buckets.length > 0 && (
        <SplitExpenseModal buckets={buckets} onClose={() => setShowSplitModal(false)} />
      )}
      {drillBucket && <BucketDrilldown bucket={drillBucket} onClose={() => setDrillBucket(null)} />}

      {summary?.alerts && summary.alerts.length > 0 && <AlertsBanner alerts={summary.alerts} />}

      {/* ── Hero ── */}
      {hasSummary ? (
        <div className="relative overflow-hidden rounded-2xl"
          style={{ background: 'linear-gradient(145deg, #0f2444 0%, #1a2f52 45%, #0f172a 100%)' }}>

          {/* Background blobs */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #3b82f6, transparent)' }} />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)' }} />

          <div className="relative px-6 pt-6 pb-5">
            {/* Month + streak */}
            <div className="flex items-center justify-between mb-5">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(148,163,184,0.8)' }}>
                {new Date().toLocaleString(undefined, { month: 'long', year: 'numeric' })}
              </p>
              {summary.spendingStreak >= 1 && (
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                  style={{ backgroundColor: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)' }}>
                  🔥 {summary.spendingStreak} week streak
                </span>
              )}
            </div>

            {/* Main spend + progress */}
            <div className="mb-5">
              <div className="flex items-end gap-3 mb-1">
                <span className="text-4xl font-bold tracking-tight text-white">{money(summary.totalSpent)}</span>
                <span className="mb-1 text-sm" style={{ color: 'rgba(148,163,184,0.7)' }}>
                  of {money(budgetLimit)}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full overflow-hidden rounded-full mt-3" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${spentPct}%`, backgroundColor: barColor }} />
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-xs" style={{ color: 'rgba(148,163,184,0.6)' }}>
                  {spentPct.toFixed(0)}% used
                </p>
                <p className="text-xs" style={{ color: 'rgba(148,163,184,0.6)' }}>
                  {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                </p>
              </div>
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <KpiCard label="Available" value={money(summary.available)} good={summary.available >= 0} />
              <KpiCard label="Daily budget" value={money(dailyBudget)} good={dailyBudget > 0} />
              <KpiCard label="Proj. savings" value={money(summary.projectedSavings)} good={summary.projectedSavings >= 0} accent />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              {buckets.length > 0 && (
                <button onClick={() => setShowExpenseModal(true)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                  style={{ backgroundColor: '#3b82f6' }}>
                  <Plus size={15} />
                  Expense
                </button>
              )}
              <button onClick={() => setShowIncomeModal(true)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition"
                style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.85)', backgroundColor: 'rgba(255,255,255,0.07)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.13)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.07)')}>
                <Plus size={15} />
                Income
              </button>
              {buckets.length > 0 && (
                <button onClick={() => setShowSplitModal(true)}
                  className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition"
                  style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.85)', backgroundColor: 'rgba(255,255,255,0.07)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.13)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.07)')}>
                  <Zap size={15} />
                  Split
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* No budget set */
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-dashed p-6"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
          <div>
            <p className="font-semibold" style={{ color: 'var(--color-text)' }}>Set up your budget</p>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>Add your salary in Settings to unlock budgeting insights.</p>
          </div>
          <div className="flex gap-2">
            {buckets.length > 0 && (
              <button onClick={() => setShowExpenseModal(true)}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: 'var(--color-primary)' }}>
                <Plus size={14} /> Expense
              </button>
            )}
            <Link to="/settings"
              className="rounded-xl px-4 py-2 text-sm font-medium transition"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', backgroundColor: 'var(--color-surface-2)' }}>
              Settings →
            </Link>
          </div>
        </div>
      )}

      {/* Keyboard hint */}
      <p className="hidden text-center text-xs sm:block" style={{ color: 'var(--color-text-faint)' }}>
        <Kbd>E</Kbd> expense {'  '}<Kbd>I</Kbd> income {'  '}<Kbd>S</Kbd> split
      </p>

      {/* ── Upcoming bills ── */}
      {hasSummary && summary.upcomingBills.length > 0 && (
        <Section>
          <SectionHeader title="Upcoming bills" right={
            <Link to="/recurring" className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>Manage →</Link>
          }>
            <Bell size={14} style={{ color: 'var(--color-primary)' }} />
          </SectionHeader>
          <div className="space-y-1">
            {summary.upcomingBills.slice(0, 5).map((bill) => {
              const urgent = bill.daysUntilDue === 0;
              const soon = bill.daysUntilDue <= 2;
              const dueColor = urgent ? 'var(--color-error)' : soon ? 'var(--color-warning)' : 'var(--color-text-muted)';
              const dueBg = urgent ? 'rgba(220,38,38,0.1)' : soon ? 'rgba(217,119,6,0.1)' : 'var(--color-surface-2)';
              const dueLabel = urgent ? 'Due today' : bill.daysUntilDue === 1 ? 'Due tomorrow' : `${bill.daysUntilDue} days`;
              return (
                <div key={bill._id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition"
                  style={{ backgroundColor: 'var(--color-surface-2)' }}>
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: dueBg, color: dueColor }}>
                    <Calendar size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                      {bill.serviceName || bill.note || 'Bill'}
                    </p>
                  </div>
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{ backgroundColor: dueBg, color: dueColor }}>
                    {dueLabel}
                  </span>
                  <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{money(bill.amount)}</span>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ── Category budgets ── */}
      {buckets.some((b) => b.monthlyLimit > 0 || b.spent > 0) && (
        <Section>
          <SectionHeader title="Category budgets" right={
            hasSummary ? (
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                style={{
                  backgroundColor: summary.onTrack ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)',
                  color: summary.onTrack ? 'var(--color-success)' : 'var(--color-error)',
                }}>
                {summary.onTrack ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                {summary.onTrack ? 'On track' : 'Over pace'}
              </span>
            ) : null
          } />
          <BucketBars buckets={buckets} onBucketClick={setDrillBucket} />
          <p className="mt-3 text-xs" style={{ color: 'var(--color-text-faint)' }}>
            Tap a category to see this month's breakdown
          </p>
        </Section>
      )}

      {/* ── View full reports ── */}
      {hasSummary && (
        <Link to="/reports"
          className="flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-medium transition"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-surface-2)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--color-surface)')}>
          <BarChart2 size={15} />
          View full report & trends
        </Link>
      )}
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────── */

function KpiCard({ label, value, good, accent }: {
  label: string; value: string; good: boolean; accent?: boolean;
}) {
  const color = !good ? '#f87171' : accent ? '#a5b4fc' : '#4ade80';
  return (
    <div className="rounded-xl px-3 py-2.5 text-center"
      style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <p className="text-[11px] mb-0.5" style={{ color: 'rgba(148,163,184,0.65)' }}>{label}</p>
      <p className="text-sm font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5"
      style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
      {children}
    </div>
  );
}

function SectionHeader({ title, right, children }: {
  title: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
        {children}
        {title}
      </h2>
      {right}
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded px-1.5 py-0.5 font-mono text-[10px]"
      style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-faint)' }}>
      {children}
    </kbd>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-72 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-56 w-full rounded-2xl" />
    </div>
  );
}
