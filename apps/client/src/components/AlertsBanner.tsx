import { useState } from 'react';
import { Info, AlertTriangle, AlertCircle, X } from 'lucide-react';
import type { Alert } from '@dwexpense/types';

const CONFIG: Record<Alert['level'], { icon: typeof Info; color: string; bg: string; border: string }> = {
  info:    { icon: Info,          color: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.2)'  },
  warning: { icon: AlertTriangle, color: '#d97706', bg: 'rgba(217,119,6,0.08)',   border: 'rgba(217,119,6,0.2)'   },
  danger:  { icon: AlertCircle,   color: '#dc2626', bg: 'rgba(220,38,38,0.08)',   border: 'rgba(220,38,38,0.2)'   },
};

export function AlertsBanner({ alerts }: { alerts: Alert[] }) {
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const visible = alerts.filter((_, i) => !dismissed.has(i));
  if (visible.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl" style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
      {visible.map((alert, idx) => {
        const globalIdx = alerts.indexOf(alert);
        const { icon: Icon, color, bg, border } = CONFIG[alert.level];
        return (
          <div
            key={globalIdx}
            className="flex items-start gap-3 px-4 py-3"
            style={{
              backgroundColor: bg,
              borderBottom: idx < visible.length - 1 ? `1px solid ${border}` : 'none',
            }}
          >
            <Icon size={14} className="mt-0.5 flex-shrink-0" style={{ color }} />
            <span className="flex-1 text-xs leading-relaxed" style={{ color: 'var(--color-text)' }}>
              {alert.message}
            </span>
            <button
              onClick={() => setDismissed((s) => new Set([...s, globalIdx]))}
              className="flex-shrink-0 rounded p-0.5 transition hover:opacity-60"
              style={{ color: 'var(--color-text-faint)' }}
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
