import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNetWorth, useAddNetWorthSnapshot, useDeleteNetWorthSnapshot } from '../hooks/useNetWorth';
import { money } from '../lib/format';
import type { NetWorthEntry } from '@dwexpense/types';

const today = () => new Date().toISOString().slice(0, 10);

interface EntryRow { id: number; label: string; amount: string }
let _id = 0;
const newRow = (): EntryRow => ({ id: ++_id, label: '', amount: '' });

export function NetWorth() {
  const { data: snapshots = [] } = useNetWorth();
  const add = useAddNetWorthSnapshot();
  const del = useDeleteNetWorthSnapshot();

  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(today());
  const [assets, setAssets] = useState<EntryRow[]>([newRow()]);
  const [liabilities, setLiabilities] = useState<EntryRow[]>([newRow()]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const latest = sorted[sorted.length - 1];
  const currentNW = latest?.netWorth ?? 0;

  const totalAssets = assets.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const totalLiabilities = liabilities.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const previewNW = totalAssets - totalLiabilities;

  const maxAbsNW = Math.max(...sorted.map((s) => Math.abs(s.netWorth)), 1);

  function updateRow(rows: EntryRow[], setRows: (r: EntryRow[]) => void, id: number, field: keyof EntryRow, value: string) {
    setRows(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  function toEntries(rows: EntryRow[]): NetWorthEntry[] {
    return rows
      .filter((r) => r.label.trim() || parseFloat(r.amount) > 0)
      .map((r) => ({ label: r.label.trim() || 'Untitled', amount: parseFloat(r.amount) || 0 }));
  }

  async function handleSave() {
    const assetEntries = toEntries(assets);
    const liabilityEntries = toEntries(liabilities);
    if (assetEntries.length === 0 && liabilityEntries.length === 0) {
      toast.error('Add at least one asset or liability');
      return;
    }
    try {
      await add.mutateAsync({ date, assets: assetEntries, liabilities: liabilityEntries });
      toast.success('Snapshot saved');
      setShowForm(false);
      setDate(today());
      setAssets([newRow()]);
      setLiabilities([newRow()]);
    } catch {
      toast.error('Failed to save snapshot');
    }
  }

  function handleCancel() {
    setShowForm(false);
    setDate(today());
    setAssets([newRow()]);
    setLiabilities([newRow()]);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold" style={{ color: 'var(--color-text)' }}>
            <TrendingUp size={20} style={{ color: 'var(--color-primary)' }} />
            Net Worth
          </h1>
          {snapshots.length > 0 && (
            <p
              className="mt-1 text-3xl font-bold"
              style={{ color: currentNW >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}
            >
              {money(currentNW)}
            </p>
          )}
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Plus size={14} /> Add snapshot
          </button>
        )}
      </div>

      {/* Trend chart */}
      {sorted.length > 0 && (
        <div
          className="rounded-2xl p-5"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}
        >
          <h2 className="mb-4 text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Net worth over time</h2>
          <div className="flex items-end gap-2" style={{ height: 100 }}>
            {sorted.map((s) => {
              const pct = Math.abs(s.netWorth) / maxAbsNW;
              const height = Math.max(4, pct * 80);
              const isNeg = s.netWorth < 0;
              const label = new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              return (
                <div key={s._id} className="flex flex-1 flex-col items-center gap-1" title={`${label}: ${money(s.netWorth)}`}>
                  <span className="text-[9px] font-semibold" style={{ color: isNeg ? 'var(--color-error)' : 'var(--color-success)' }}>
                    {money(s.netWorth)}
                  </span>
                  <div
                    className="w-full rounded-t transition-all duration-500"
                    style={{
                      height,
                      backgroundColor: isNeg ? 'var(--color-error)' : 'var(--color-success)',
                      opacity: 0.8,
                    }}
                  />
                  <span className="truncate text-[9px]" style={{ color: 'var(--color-text-faint)', maxWidth: '100%' }}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add snapshot form */}
      {showForm && (
        <div
          className="rounded-2xl p-5 space-y-5"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>New snapshot</h2>

          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg px-3 py-2 text-sm"
              style={{
                backgroundColor: 'var(--color-input-bg)',
                border: '1px solid var(--color-input-border)',
                color: 'var(--color-input-text)',
              }}
            />
          </div>

          {/* Assets */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Assets</p>
              <button
                type="button"
                onClick={() => setAssets([...assets, newRow()])}
                className="flex items-center gap-1 text-xs"
                style={{ color: 'var(--color-primary)' }}
              >
                <Plus size={11} /> Add asset
              </button>
            </div>
            <div className="space-y-2">
              {assets.map((row) => (
                <div key={row.id} className="flex gap-2">
                  <input
                    placeholder="Label (e.g. Savings account)"
                    value={row.label}
                    onChange={(e) => updateRow(assets, setAssets, row.id, 'label', e.target.value)}
                    className="flex-1 rounded-lg px-3 py-2 text-sm"
                    style={{ backgroundColor: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)', color: 'var(--color-input-text)' }}
                  />
                  <input
                    type="number"
                    placeholder="Amount"
                    value={row.amount}
                    onChange={(e) => updateRow(assets, setAssets, row.id, 'amount', e.target.value)}
                    className="w-32 rounded-lg px-3 py-2 text-sm"
                    style={{ backgroundColor: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)', color: 'var(--color-input-text)' }}
                  />
                  {assets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setAssets(assets.filter((r) => r.id !== row.id))}
                      className="rounded-lg p-2 transition"
                      style={{ color: 'var(--color-error)' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs font-semibold" style={{ color: 'var(--color-success)' }}>
              Total assets: {money(totalAssets)}
            </p>
          </div>

          {/* Liabilities */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Liabilities</p>
              <button
                type="button"
                onClick={() => setLiabilities([...liabilities, newRow()])}
                className="flex items-center gap-1 text-xs"
                style={{ color: 'var(--color-primary)' }}
              >
                <Plus size={11} /> Add liability
              </button>
            </div>
            <div className="space-y-2">
              {liabilities.map((row) => (
                <div key={row.id} className="flex gap-2">
                  <input
                    placeholder="Label (e.g. Car loan)"
                    value={row.label}
                    onChange={(e) => updateRow(liabilities, setLiabilities, row.id, 'label', e.target.value)}
                    className="flex-1 rounded-lg px-3 py-2 text-sm"
                    style={{ backgroundColor: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)', color: 'var(--color-input-text)' }}
                  />
                  <input
                    type="number"
                    placeholder="Amount"
                    value={row.amount}
                    onChange={(e) => updateRow(liabilities, setLiabilities, row.id, 'amount', e.target.value)}
                    className="w-32 rounded-lg px-3 py-2 text-sm"
                    style={{ backgroundColor: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)', color: 'var(--color-input-text)' }}
                  />
                  {liabilities.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setLiabilities(liabilities.filter((r) => r.id !== row.id))}
                      className="rounded-lg p-2 transition"
                      style={{ color: 'var(--color-error)' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs font-semibold" style={{ color: 'var(--color-error)' }}>
              Total liabilities: {money(totalLiabilities)}
            </p>
          </div>

          {/* Preview */}
          <div
            className="rounded-xl p-3"
            style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border-light)' }}
          >
            <div className="flex justify-between text-xs" style={{ color: 'var(--color-text-muted)' }}>
              <span>Total Assets</span><span className="font-semibold" style={{ color: 'var(--color-success)' }}>{money(totalAssets)}</span>
            </div>
            <div className="mt-1 flex justify-between text-xs" style={{ color: 'var(--color-text-muted)' }}>
              <span>Total Liabilities</span><span className="font-semibold" style={{ color: 'var(--color-error)' }}>{money(totalLiabilities)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t pt-2 text-sm font-bold" style={{ borderColor: 'var(--color-border)', color: previewNW >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
              <span>Net Worth</span><span>{money(previewNW)}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={add.isPending}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {add.isPending && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              Save snapshot
            </button>
            <button
              onClick={handleCancel}
              className="rounded-xl px-4 py-2 text-sm font-semibold transition hover:opacity-80"
              style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Snapshot history */}
      {snapshots.length === 0 ? (
        <div
          className="rounded-2xl p-8 text-center"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px dashed var(--color-border)' }}
        >
          <TrendingUp size={28} className="mx-auto mb-3" style={{ color: 'var(--color-text-faint)' }} />
          <p className="font-medium" style={{ color: 'var(--color-text)' }}>No snapshots yet.</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Add your first to start tracking your net worth.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Snapshot history</h2>
          {[...sorted].reverse().map((s) => {
            const isOpen = expanded[s._id];
            const nwColor = s.netWorth >= 0 ? 'var(--color-success)' : 'var(--color-error)';
            return (
              <div
                key={s._id}
                className="rounded-2xl"
                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}
              >
                <div className="flex items-center gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                      {new Date(s.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      <span>Assets: <span className="font-semibold" style={{ color: 'var(--color-success)' }}>{money(s.totalAssets)}</span></span>
                      <span>Liabilities: <span className="font-semibold" style={{ color: 'var(--color-error)' }}>{money(s.totalLiabilities)}</span></span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold" style={{ color: nwColor }}>{money(s.netWorth)}</p>
                  </div>
                  <button
                    onClick={() => setExpanded((prev) => ({ ...prev, [s._id]: !prev[s._id] }))}
                    className="rounded-lg p-1.5 transition hover:opacity-70"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                  <button
                    onClick={() => del.mutate(s._id)}
                    disabled={del.isPending}
                    className="rounded-lg p-1.5 transition"
                    style={{ color: 'var(--color-error)' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {isOpen && (
                  <div className="border-t px-4 pb-4 pt-3" style={{ borderColor: 'var(--color-border-light)' }}>
                    {s.assets.length > 0 && (
                      <div className="mb-3">
                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-faint)' }}>Assets</p>
                        <ul className="space-y-1">
                          {s.assets.map((a, i) => (
                            <li key={i} className="flex justify-between text-sm" style={{ color: 'var(--color-text-muted)' }}>
                              <span>{a.label}</span>
                              <span className="font-medium" style={{ color: 'var(--color-success)' }}>{money(a.amount)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {s.liabilities.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-faint)' }}>Liabilities</p>
                        <ul className="space-y-1">
                          {s.liabilities.map((a, i) => (
                            <li key={i} className="flex justify-between text-sm" style={{ color: 'var(--color-text-muted)' }}>
                              <span>{a.label}</span>
                              <span className="font-medium" style={{ color: 'var(--color-error)' }}>{money(a.amount)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
