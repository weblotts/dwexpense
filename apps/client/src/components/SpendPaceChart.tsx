import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { MonthlySummary } from '@dwexpense/types';
import { money } from '../lib/format';

interface TooltipProps {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: number;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 10,
      padding: '8px 12px',
      boxShadow: '0 4px 16px rgb(0 0 0 / 0.12)',
      fontSize: 12,
    }}>
      <div style={{ color: 'var(--color-text-muted)', marginBottom: 4, fontWeight: 600 }}>Day {label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text)' }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: p.color }} />
          <span style={{ color: 'var(--color-text-muted)' }}>{p.name === 'actual' ? 'Spent' : 'Budget pace'}</span>
          <span style={{ marginLeft: 'auto', fontWeight: 700, paddingLeft: 12 }}>{money(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function SpendPaceChart({ summary }: { summary: MonthlySummary }) {
  const { dailySpend, totalAllocated, totalIncome, savingsGoal } = summary;
  const spendLimit = totalAllocated > 0 ? totalAllocated : totalIncome - savingsGoal;

  if (dailySpend.length === 0) {
    return (
      <div className="flex h-52 flex-col items-center justify-center gap-1" style={{ color: 'var(--color-text-faint)' }}>
        <svg className="h-8 w-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3m0 0l3 3m-3-3v8m-4-4H5a2 2 0 01-2-2V7a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2h-1" />
        </svg>
        <span className="text-sm">No spending recorded yet</span>
      </div>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={dailySpend} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#818CF8" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#818CF8" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--color-text-faint)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-faint)' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={48} />
          <Tooltip content={<CustomTooltip />} />
          {spendLimit > 0 && (
            <ReferenceLine y={spendLimit} stroke="#F59E0B" strokeDasharray="5 3" strokeWidth={1.5}
              label={{ value: 'Limit', position: 'insideTopRight', fontSize: 10, fill: '#F59E0B', dy: -4 }} />
          )}
          <Area type="monotone" dataKey="budget" stroke="#34D399" strokeWidth={1.5} strokeDasharray="5 3" fill="none" dot={false} name="budget" />
          <Area type="monotone" dataKey="actual" stroke="#818CF8" strokeWidth={2.5} fill="url(#actualGrad)" dot={false}
            activeDot={{ r: 4, fill: '#818CF8', stroke: 'var(--color-surface)', strokeWidth: 2 }} name="actual" />
        </AreaChart>
      </ResponsiveContainer>
      <div className="mt-2 flex gap-5 text-xs" style={{ color: 'var(--color-text-faint)' }}>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 rounded bg-indigo-400" /> Actual
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 border-t-2 border-dashed border-emerald-400" /> Budget pace
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 border-t-2 border-dashed border-amber-400" /> Limit
        </span>
      </div>
    </div>
  );
}
