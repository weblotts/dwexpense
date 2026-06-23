import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { MonthlySummary } from '@dwexpense/types';
import { money } from '../lib/format';

const FALLBACK_COLORS = ['#818CF8', '#34D399', '#FB923C', '#F472B6', '#A78BFA', '#38BDF8'];

interface TooltipProps {
  active?: boolean;
  payload?: { name: string; value: number; payload: { color: string } }[];
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 10,
      padding: '8px 12px',
      boxShadow: '0 4px 16px rgb(0 0 0 / 0.12)',
      fontSize: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: p.payload.color }} />
        <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{p.name}</span>
      </div>
      <div style={{ marginTop: 2, color: 'var(--color-text-muted)' }}>{money(p.value)}</div>
    </div>
  );
}

export function SpendingDonut({ summary }: { summary: MonthlySummary }) {
  const { topCategories, totalSpent, available, savingsGoal, totalIncome } = summary;

  const hasData = topCategories.length > 0 || savingsGoal > 0;
  if (!hasData) {
    return (
      <div className="flex h-52 flex-col items-center justify-center gap-1" style={{ color: 'var(--color-text-faint)' }}>
        <svg className="h-8 w-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
        <span className="text-sm">No spending yet</span>
      </div>
    );
  }

  const slices = [
    ...topCategories.map((c, i) => ({
      name: c.name,
      value: c.spent,
      color: c.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
    })),
    ...(savingsGoal > 0 ? [{ name: 'Savings', value: savingsGoal, color: '#A5B4FC' }] : []),
    ...(available > 0 ? [{ name: 'Remaining', value: available, color: '#CBD5E1' }] : []),
  ];

  const pctSpent = totalIncome > 0 ? Math.round((totalSpent / totalIncome) * 100) : 0;

  return (
    <div>
      <div className="mb-3">
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{pctSpent}%</span> of income spent
        </span>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              <Pie data={slices} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                paddingAngle={2} dataKey="value" strokeWidth={0} startAngle={90} endAngle={-270}>
                {slices.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{money(totalSpent)}</div>
            <div className="text-xs" style={{ color: 'var(--color-text-faint)' }}>spent</div>
          </div>
        </div>

        <div className="flex-1 space-y-2 min-w-0">
          {slices.map((s) => (
            <div key={s.name} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="truncate text-xs" style={{ color: 'var(--color-text-muted)' }}>{s.name}</span>
              <span className="ml-auto flex-shrink-0 text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{money(s.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
