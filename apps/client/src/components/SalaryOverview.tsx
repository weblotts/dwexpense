import { Link } from 'react-router-dom';
import type { MonthlySummary } from '@dwexpense/types';
import { money } from '../lib/format';

/** Salary → savings → allocated → spent waterfall, with money left to spend. */
export function SalaryOverview({ summary }: { summary: MonthlySummary }) {
  const { totalIncome, salary, extraIncome, savingsGoal, totalSpent, available, unallocated } = summary;

  if (salary === 0 && extraIncome === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-center dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm text-slate-500">
          Set your monthly salary to see how your money is allocated.
        </p>
        <Link to="/settings" className="mt-2 inline-block text-sm font-medium text-blue-600">
          Go to Settings →
        </Link>
      </div>
    );
  }

  // Segmented bar of income: savings / spent / available.
  const denom = totalIncome > 0 ? totalIncome : 1;
  const seg = (n: number) => `${Math.max(0, Math.min(100, (n / denom) * 100))}%`;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-slate-500">Income this month</h2>
        <span className="text-2xl font-bold">{money(totalIncome)}</span>
      </div>
      <p className="mb-4 text-xs text-slate-400">
        Salary {money(salary)}
        {extraIncome > 0 && ` + extra ${money(extraIncome)}`}
      </p>

      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="h-full bg-indigo-500" style={{ width: seg(savingsGoal) }} title="Savings" />
        <div className="h-full bg-rose-500" style={{ width: seg(totalSpent) }} title="Spent" />
        <div className="h-full bg-emerald-500" style={{ width: seg(Math.max(0, available)) }} title="Available" />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <Stat label="Savings" value={money(savingsGoal)} dot="bg-indigo-500" />
        <Stat label="Spent" value={money(totalSpent)} dot="bg-rose-500" />
        <Stat
          label="Left to spend"
          value={money(available)}
          dot="bg-emerald-500"
          danger={available < 0}
        />
      </div>

      <div className="mt-4 flex justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800">
        <span>Projected month-end spend: {money(summary.projectedSpend)}</span>
        <span className={unallocated < 0 ? 'text-amber-600' : ''}>
          Unallocated: {money(unallocated)}
        </span>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  dot,
  danger,
}: {
  label: string;
  value: string;
  dot: string;
  danger?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-center gap-1.5 text-xs text-slate-500">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        {label}
      </div>
      <div className={`font-semibold ${danger ? 'text-red-500' : ''}`}>{value}</div>
    </div>
  );
}
