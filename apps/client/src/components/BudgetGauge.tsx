import type { MonthlySummary } from '@dwexpense/types';
import { money } from '../lib/format';

interface Props {
  summary: MonthlySummary;
}

export function BudgetGauge({ summary }: Props) {
  const {
    totalIncome, totalSpent, savingsGoal, totalAllocated,
    projectedSpend, daysInMonth, dayOfMonth, available, unallocated,
  } = summary;

  const denom = totalIncome > 0 ? totalIncome : 1;
  const pctSavings = Math.min(100, (savingsGoal / denom) * 100);
  const pctSpent = Math.min(100, (totalSpent / denom) * 100);
  const pctAvail = Math.max(0, Math.min(100, (Math.max(0, available) / denom) * 100));

  const daysLeft = daysInMonth - dayOfMonth;
  const dailyBudget = available > 0 ? available / Math.max(1, daysLeft) : 0;
  const pctMonth = Math.round((dayOfMonth / daysInMonth) * 100);

  return (
    <div className="space-y-4">
      {/* Income bar */}
      <div>
        <div className="mb-1.5 flex justify-between text-xs text-slate-500">
          <span>Income {money(totalIncome)}</span>
          <span>{pctMonth}% through month</span>
        </div>
        <div className="flex h-4 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full bg-indigo-400 transition-all" style={{ width: `${pctSavings}%` }} title={`Savings ${money(savingsGoal)}`} />
          <div className="h-full bg-rose-400 transition-all" style={{ width: `${pctSpent}%` }} title={`Spent ${money(totalSpent)}`} />
          <div className="h-full bg-emerald-400 transition-all" style={{ width: `${pctAvail}%` }} title={`Available ${money(available)}`} />
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <LegendDot color="bg-indigo-400" label="Savings" value={money(savingsGoal)} />
          <LegendDot color="bg-rose-400" label="Spent" value={money(totalSpent)} />
          <LegendDot color="bg-emerald-400" label="Available" value={money(available)} danger={available < 0} />
        </div>
      </div>

      {/* Key numbers */}
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Daily budget" value={money(dailyBudget)} sub={`${daysLeft}d left`} tone={dailyBudget > 0 ? 'good' : 'bad'} />
        <StatTile label="Projected spend" value={money(projectedSpend)} sub="at this pace" tone={projectedSpend <= (totalAllocated || totalIncome - savingsGoal) ? 'good' : 'bad'} />
        <StatTile label="Unallocated" value={money(unallocated)} sub="budget headroom" tone={unallocated >= 0 ? 'neutral' : 'bad'} />
      </div>
    </div>
  );
}

function LegendDot({ color, label, value, danger }: { color: string; label: string; value: string; danger?: boolean }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      <span className="text-slate-500">{label}</span>
      <span className={`font-medium ${danger ? 'text-red-500' : 'text-slate-700 dark:text-slate-200'}`}>{value}</span>
    </span>
  );
}

function StatTile({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: 'good' | 'bad' | 'neutral' }) {
  const color = tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-red-500' : 'text-slate-700 dark:text-slate-200';
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50 text-center">
      <div className="text-xs text-slate-500 mb-0.5">{label}</div>
      <div className={`text-base font-bold ${color}`}>{value}</div>
      <div className="text-xs text-slate-400">{sub}</div>
    </div>
  );
}
