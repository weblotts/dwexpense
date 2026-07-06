import { useMemo, useState } from 'react';
import { Search, TrendingDown, TrendingUp, Trash2, Download, CheckSquare, Square, Repeat2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useBuckets } from '../hooks/useBuckets';
import { useExpenses } from '../hooks/useExpenses';
import { useIncome } from '../hooks/useIncome';
import { useDeleteExpense } from '../hooks/useDeleteExpense';
import { useDeleteIncome } from '../hooks/useIncome';
import { useQueryClient } from '@tanstack/react-query';
import { currentMonth, money, monthLabel, parseLocalDate } from '../lib/format';
import { Field } from '../components/Field';
import { api, apiErrorMessage } from '../lib/api';
import { Skeleton } from '../components/Skeleton';
import type { Expense, Income, BucketWithSpend } from '@dwexpense/types';

function toDateKey(iso: string) {
  const d = parseLocalDate(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function formatDay(iso: string) {
  return parseLocalDate(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

type Entry = { kind: 'expense'; data: Expense } | { kind: 'income'; data: Income };

export function History() {
  const [month, setMonth] = useState(currentMonth());
  const [exporting, setExporting] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bucketId, setBucketId] = useState('');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'expenses' | 'income'>('all');

  const qc = useQueryClient();
  const { data: buckets } = useBuckets();
  const { data: expenses = [], isLoading: loadingExp } = useExpenses({ month, bucketId: bucketId || undefined });
  const { data: incomeList = [], isLoading: loadingInc } = useIncome(month);
  const delExpense = useDeleteExpense();
  const delIncome = useDeleteIncome();

  const isLoading = loadingExp || loadingInc;
  const bucketMap = useMemo(() => new Map((buckets ?? []).map((b) => [b._id, b])), [buckets]);

  async function handleExportCsv() {
    setExporting(true);
    try {
      const res = await api.get('/export/csv', { params: { month }, responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url; a.download = `expenses-${month}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) { toast.error(apiErrorMessage(err)); }
    finally { setExporting(false); }
  }

  function toggleSelectMode() { setSelectMode((v) => !v); setSelected(new Set()); }
  function toggleItem(id: string) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    setBulkDeleting(true);
    try {
      await Promise.all([...selected].map((id) => api.delete(`/expenses/${id}`)));
      toast.success(`${selected.size} expense${selected.size !== 1 ? 's' : ''} deleted`);
      setSelected(new Set()); setSelectMode(false);
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.refetchQueries({ queryKey: ['summary'] });
      qc.refetchQueries({ queryKey: ['buckets'] });
      qc.invalidateQueries({ queryKey: ['summary-months'] });
    } catch (err) { toast.error(apiErrorMessage(err)); }
    finally { setBulkDeleting(false); }
  }

  const entries = useMemo<Entry[]>(() => {
    const q = search.toLowerCase();
    const exps: Entry[] = expenses
      .filter((e) => {
        if (tab === 'income') return false;
        const b = bucketMap.get(e.bucketId);
        return !q || (e.note ?? '').toLowerCase().includes(q) || b?.name.toLowerCase().includes(q);
      })
      .map((e) => ({ kind: 'expense' as const, data: e }));
    const inc: Entry[] = incomeList
      .filter((i) => {
        if (tab === 'expenses') return false;
        if (bucketId) return false; // income has no bucket
        return !q || (i.source ?? '').toLowerCase().includes(q);
      })
      .map((i) => ({ kind: 'income' as const, data: i }));
    return [...exps, ...inc].sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime());
  }, [expenses, incomeList, bucketMap, search, tab, bucketId]);

  const grouped = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const entry of entries) {
      const key = toDateKey(entry.data.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(entry);
    }
    return [...map.entries()];
  }, [entries]);

  // Only count what's visible in the current filter
  const visibleExpenses = entries.filter((e) => e.kind === 'expense');
  const visibleIncome = entries.filter((e) => e.kind === 'income');
  const totalSpent = visibleExpenses.reduce((s, e) => s + e.data.amount, 0);
  const totalIncome = visibleIncome.reduce((s, i) => s + i.data.amount, 0);
  const showNet = !bucketId && tab === 'all' && totalIncome > 0 && totalSpent > 0;
  const net = totalIncome - totalSpent;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>History</h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{monthLabel(month)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleSelectMode}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition hover:opacity-80"
              style={{
                backgroundColor: selectMode ? 'var(--color-primary)' : 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                color: selectMode ? '#fff' : 'var(--color-text-muted)',
              }}>
              <CheckSquare size={13} /> Select
            </button>
            <button onClick={handleExportCsv} disabled={exporting}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
              {exporting
                ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                : <Download size={13} />}
              Export CSV
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          <Field as="select" value={bucketId} onChange={(e) => setBucketId(e.target.value)}>
            <option value="">All categories</option>
            {buckets?.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
          </Field>
        </div>
      </div>

      {/* Summary stats */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="flex" style={{ gap: 0 }}>
          {(tab === 'all' || tab === 'expenses') && (
            <StatCard first
              label={bucketId ? (buckets?.find(b => b._id === bucketId)?.name ?? 'Category') : 'Spent'}
              value={money(totalSpent)}
              icon={<TrendingDown size={12} />}
              color="var(--color-error)"
              colorBg="rgba(220,38,38,0.08)"
            />
          )}
          {(tab === 'all' || tab === 'income') && !bucketId && (
            <StatCard first={tab === 'income'}
              label="Income"
              value={money(totalIncome)}
              icon={<TrendingUp size={12} />}
              color="var(--color-success)"
              colorBg="rgba(22,163,74,0.08)"
            />
          )}
          {showNet && (
            <StatCard
              label="Saved"
              value={money(net)}
              icon={<TrendingUp size={12} />}
              color={net >= 0 ? 'var(--color-success)' : 'var(--color-error)'}
              colorBg={net >= 0 ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)'}
            />
          )}
        </div>
      </div>

      {/* Search + tabs */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[180px] flex-1">
          <Field icon={<Search size={13} />}
            placeholder="Search notes, categories…"
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex rounded-lg p-0.5" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
          {(['all', 'expenses', 'income'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="rounded-md px-3 py-1.5 text-xs font-medium capitalize transition"
              style={{
                backgroundColor: tab === t ? 'var(--color-primary)' : 'transparent',
                color: tab === t ? '#fff' : 'var(--color-text-muted)',
              }}>
              {t}
            </button>
          ))}
        </div>
        <span className="text-xs" style={{ color: 'var(--color-text-faint)' }}>{entries.length} transactions</span>
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
        </div>
      ) : grouped.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-faint)' }}>
          No transactions found{search ? ' for your search' : ''}.
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([day, items]) => {
            const daySpent = items.filter((e) => e.kind === 'expense').reduce((s, e) => s + e.data.amount, 0);
            const dayIncome = items.filter((e) => e.kind === 'income').reduce((s, e) => s + e.data.amount, 0);
            return (
              <div key={day}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-faint)' }}>
                    {formatDay(day)}
                  </span>
                  <div className="flex items-center gap-3">
                    {dayIncome > 0 && (
                      <span className="text-xs font-semibold" style={{ color: 'var(--color-success)' }}>
                        +{money(dayIncome)}
                      </span>
                    )}
                    {daySpent > 0 && (
                      <span className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                        {money(daySpent)}
                      </span>
                    )}
                  </div>
                </div>
                <ul className="overflow-hidden rounded-xl" style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                  {items.map((entry) =>
                    entry.kind === 'expense' ? (
                      <ExpenseRow
                        key={entry.data._id}
                        expense={entry.data}
                        bucket={bucketMap.get(entry.data.bucketId)}
                        onDelete={() => delExpense.mutate(entry.data._id)}
                        selectMode={selectMode}
                        selected={selected.has(entry.data._id)}
                        onToggleSelect={() => toggleItem(entry.data._id)}
                      />
                    ) : (
                      <IncomeRow key={entry.data._id} income={entry.data} onDelete={() => delIncome.mutate(entry.data._id)} />
                    )
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating bulk action bar */}
      {selectMode && (
        <div className="fixed left-0 right-0 flex items-center justify-between gap-3 px-4 py-3 md:left-auto md:right-4 md:w-auto md:rounded-xl"
          style={{ bottom: '80px', zIndex: 50, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: '0 8px 32px rgb(0 0 0 / 0.18)' }}>
          <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
            {selected.size} selected
          </span>
          <div className="flex items-center gap-2">
            <button onClick={() => { setSelectMode(false); setSelected(new Set()); }}
              className="rounded-lg px-3 py-1.5 text-sm font-medium transition hover:opacity-80"
              style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
              Cancel
            </button>
            <button onClick={handleBulkDelete} disabled={selected.size === 0 || bulkDeleting}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-error)', color: '#fff' }}>
              {bulkDeleting
                ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                : <Trash2 size={13} />}
              Delete {selected.size > 0 ? selected.size : ''} selected
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color, colorBg, first }: {
  label: string; value: string; icon: React.ReactNode; color: string; colorBg: string; first?: boolean;
}) {
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-1 px-3 py-3 min-w-0"
      style={first ? {} : { borderLeft: '1px solid var(--color-border)' }}
    >
      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: colorBg, color }}>
        {icon}
      </span>
      <p className="w-full truncate text-center text-sm font-bold tabular-nums" style={{ color }}>{value}</p>
      <span className="w-full truncate text-center text-xs" style={{ color: 'var(--color-text-faint)' }}>{label}</span>
    </div>
  );
}

function ExpenseRow({ expense, bucket, onDelete, selectMode, selected, onToggleSelect }: {
  expense: Expense; bucket: BucketWithSpend | undefined;
  onDelete: () => void; selectMode: boolean; selected: boolean; onToggleSelect: () => void;
}) {
  const recurring = expense.recurringId && typeof expense.recurringId === 'object'
    ? expense.recurringId
    : null;
  const title = recurring?.serviceName || expense.note;

  return (
    <li className="flex items-center gap-3 px-4 py-3"
      style={{ borderBottom: '1px solid var(--color-border-light)' }}>
      {selectMode && (
        <button onClick={onToggleSelect} className="flex-shrink-0 transition"
          style={{ color: selected ? 'var(--color-primary)' : 'var(--color-text-faint)' }}>
          {selected ? <CheckSquare size={16} /> : <Square size={16} />}
        </button>
      )}
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: bucket ? `${bucket.color}22` : 'var(--color-surface-2)' }}>
        {recurring
          ? <Repeat2 size={14} style={{ color: bucket?.color ?? 'var(--color-text-faint)' }} />
          : <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: bucket?.color ?? 'var(--color-text-faint)' }} />
        }
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" style={{ color: 'var(--color-text)' }}>
          {title || <span style={{ color: 'var(--color-text-faint)', fontStyle: 'italic' }}>No note</span>}
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          {bucket && (
            <span className="text-xs" style={{ color: 'var(--color-text-faint)' }}>{bucket.name}</span>
          )}
          {recurring && (
            <span
              className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium"
              style={{ backgroundColor: 'rgba(99,102,241,0.1)', color: '#6366f1' }}
            >
              <Repeat2 size={9} />
              {recurring.frequency ? recurring.frequency.charAt(0).toUpperCase() + recurring.frequency.slice(1) : 'Recurring'}
            </span>
          )}
        </div>
      </div>
      <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{money(expense.amount)}</span>
      {!selectMode && (
        <button onClick={onDelete}
          className="flex-shrink-0 rounded-lg p-1.5 transition"
          style={{ color: 'var(--color-text-faint)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(220,38,38,0.08)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-error)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = ''; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-faint)'; }}>
          <Trash2 size={13} />
        </button>
      )}
    </li>
  );
}

function IncomeRow({ income, onDelete }: { income: Income; onDelete: () => void }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3"
      style={{ borderBottom: '1px solid var(--color-border-light)' }}>
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: 'rgba(22,163,74,0.1)' }}>
        <TrendingUp size={14} style={{ color: 'var(--color-success)' }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{income.source || 'Income'}</p>
        <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>Income</p>
      </div>
      <span className="font-semibold" style={{ color: 'var(--color-success)' }}>+{money(income.amount)}</span>
      <button onClick={onDelete}
        className="flex-shrink-0 rounded-lg p-1.5 transition"
        style={{ color: 'var(--color-text-faint)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(220,38,38,0.08)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-error)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = ''; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-faint)'; }}>
        <Trash2 size={13} />
      </button>
    </li>
  );
}
