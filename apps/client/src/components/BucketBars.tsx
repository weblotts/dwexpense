import type { BucketWithSpend } from '@dwexpense/types';
import { money } from '../lib/format';

interface Props {
  buckets: BucketWithSpend[];
  onBucketClick?: (bucket: BucketWithSpend) => void;
}

export function BucketBars({ buckets, onBucketClick }: Props) {
  const data = buckets
    .filter((b) => b.monthlyLimit > 0 || b.spent > 0)
    .sort((a, b) => b.spent - a.spent);

  if (data.length === 0) return null;

  const maxVal = Math.max(...data.map((b) => Math.max(b.spent, b.monthlyLimit)), 1);

  return (
    <div className="space-y-4">
      {data.map((b) => {
        const hasLimit = b.monthlyLimit > 0;
        const pct = hasLimit ? Math.min((b.spent / b.monthlyLimit) * 100, 100) : 0;
        const over = hasLimit && b.spent > b.monthlyLimit;
        const overAmt = over ? b.spent - b.monthlyLimit : 0;
        const remaining = hasLimit ? b.monthlyLimit - b.spent : 0;
        const trackPct = hasLimit
          ? (b.monthlyLimit / maxVal) * 100
          : (b.spent / maxVal) * 100;

        return (
          <div key={b._id}
            onClick={() => onBucketClick?.(b)}
            className={onBucketClick ? 'group rounded-xl p-2 -mx-2 transition-colors' : ''}
            style={onBucketClick ? { cursor: 'pointer' } : undefined}
            onMouseEnter={e => onBucketClick && ((e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--color-surface-2)')}
            onMouseLeave={e => onBucketClick && ((e.currentTarget as HTMLDivElement).style.backgroundColor = '')}
          >
            {/* Row header */}
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: b.color }} />
                <span className="truncate text-sm font-medium" style={{ color: 'var(--color-text)' }}>{b.name}</span>
                {onBucketClick && (
                  <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--color-text-faint)' }}>
                    view →
                  </span>
                )}
              </div>
              <div className="flex flex-shrink-0 items-center gap-2 text-xs">
                {over ? (
                  <span className="font-semibold" style={{ color: 'var(--color-error)' }}>
                    {money(overAmt)} over
                  </span>
                ) : hasLimit ? (
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    {money(remaining)} left
                  </span>
                ) : null}
                <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                  {money(b.spent)}
                  {hasLimit && <span style={{ color: 'var(--color-text-faint)' }}> / {money(b.monthlyLimit)}</span>}
                </span>
              </div>
            </div>

            {/* Track */}
            <div className="relative h-2 w-full overflow-visible rounded-full" style={{ backgroundColor: 'var(--color-surface-2)' }}>
              {hasLimit && (
                <div className="absolute inset-y-0 left-0 rounded-full"
                  style={{ width: `${trackPct}%`, backgroundColor: b.color + '22', border: `1px solid ${b.color}44` }} />
              )}
              <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                style={{
                  width: `${hasLimit ? pct * (trackPct / 100) : (b.spent / maxVal) * 100}%`,
                  backgroundColor: over ? 'var(--color-error)' : b.color,
                }} />
              {over && (
                <div className="absolute inset-y-0 rounded-full"
                  style={{
                    left: `${trackPct}%`,
                    width: `${Math.min(((b.spent - b.monthlyLimit) / maxVal) * 100, 100 - trackPct)}%`,
                    backgroundColor: 'var(--color-error)',
                    opacity: 0.4,
                  }} />
              )}
            </div>

            {hasLimit && (
              <div className="mt-1 text-right text-xs" style={{ color: over ? 'var(--color-error)' : 'var(--color-text-faint)' }}>
                {Math.round((b.spent / b.monthlyLimit) * 100)}%
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
