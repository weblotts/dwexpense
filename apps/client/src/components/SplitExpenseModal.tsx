import { FormEvent, useEffect, useRef, useState } from 'react';
import { X, DollarSign, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import type { BucketWithSpend, SplitExpenseInput } from '@dwexpense/types';
import { api, apiErrorMessage } from '../lib/api';
import { todayInput, money } from '../lib/format';

interface SplitRow {
  bucketId: string;
  amount: string;
  note: string;
}

interface Props {
  buckets: BucketWithSpend[];
  onClose: () => void;
}

export function SplitExpenseModal({ buckets, onClose }: Props) {
  const qc = useQueryClient();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [date, setDate] = useState(todayInput());
  const [pending, setPending] = useState(false);

  const [rows, setRows] = useState<SplitRow[]>([
    { bucketId: buckets[0]?._id ?? '', amount: '', note: '' },
    { bucketId: buckets[1]?._id ?? buckets[0]?._id ?? '', amount: '', note: '' },
  ]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  function updateRow(idx: number, field: keyof SplitRow, value: string) {
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  }

  function addRow() {
    setRows((prev) => [...prev, { bucketId: buckets[0]?._id ?? '', amount: '', note: '' }]);
  }

  function removeRow(idx: number) {
    if (rows.length <= 2) return;
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  const total = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const validRows = rows.filter((r) => r.bucketId && parseFloat(r.amount) > 0);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (validRows.length < 2) {
      toast.error('Add at least 2 valid splits');
      return;
    }
    setPending(true);
    try {
      const payload: SplitExpenseInput = {
        splits: validRows.map((r) => ({
          bucketId: r.bucketId,
          amount: parseFloat(r.amount),
          note: r.note.trim() || undefined,
        })),
        date,
      };
      await api.post('/expenses/split', payload);
      await qc.invalidateQueries({ queryKey: ['summary'] });
      await qc.invalidateQueries({ queryKey: ['buckets'] });
      await qc.invalidateQueries({ queryKey: ['expenses'] });
      toast.success(`${validRows.length} expenses added`);
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-t-2xl sm:rounded-2xl"
        style={{ backgroundColor: 'var(--color-surface)', boxShadow: '0 20px 60px rgb(0 0 0 / 0.3)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <h3 className="font-bold" style={{ color: 'var(--color-text)' }}>Split expense</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Divide one payment across categories</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:opacity-70"
            style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
            <X size={15} />
          </button>
        </div>

        <form onSubmit={submit} style={{ overflow: 'auto', flex: 1 }}>
          <div className="p-5 space-y-3">
            {rows.map((row, idx) => (
              <div key={idx} className="rounded-xl p-3 space-y-2" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Split {idx + 1}</span>
                  {rows.length > 2 && (
                    <button type="button" onClick={() => removeRow(idx)} className="rounded p-0.5 transition hover:opacity-70" style={{ color: 'var(--color-error)' }}>
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>

                {/* Category */}
                <select
                  value={row.bucketId}
                  onChange={(e) => updateRow(idx, 'bucketId', e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ backgroundColor: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)', color: 'var(--color-input-text)' }}
                >
                  {buckets.map((b) => (
                    <option key={b._id} value={b._id}>{b.name}</option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-2">
                  {/* Amount */}
                  <div className="relative">
                    <DollarSign size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-faint)' }} />
                    <input
                      type="number" step="0.01" min="0" required={idx < 2} placeholder="0.00"
                      value={row.amount}
                      onChange={(e) => updateRow(idx, 'amount', e.target.value)}
                      className="w-full rounded-lg py-2 pl-7 pr-3 text-sm"
                      style={{ backgroundColor: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)', color: 'var(--color-input-text)' }}
                    />
                  </div>

                  {/* Note */}
                  <input
                    placeholder="Note (optional)"
                    value={row.note}
                    onChange={(e) => updateRow(idx, 'note', e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-sm"
                    style={{ backgroundColor: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)', color: 'var(--color-input-text)' }}
                  />
                </div>
              </div>
            ))}

            <button type="button" onClick={addRow}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium transition hover:opacity-80"
              style={{ border: '1px dashed var(--color-border)', color: 'var(--color-text-muted)' }}>
              <Plus size={13} /> Add split
            </button>
          </div>

          {/* Footer */}
          <div className="px-5 pb-5 space-y-3 flex-shrink-0">
            {/* Total */}
            <div className="flex items-center justify-between rounded-xl px-4 py-3"
              style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
              <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Total</span>
              <span className="text-base font-bold" style={{ color: 'var(--color-text)' }}>{money(total)}</span>
            </div>

            {/* Date */}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Date</label>
              <input type="date" className="w-full rounded-lg px-3 py-2 text-sm"
                value={date} onChange={(e) => setDate(e.target.value)}
                style={{ backgroundColor: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)', color: 'var(--color-input-text)' }} />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button type="button" onClick={onClose}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition hover:opacity-80"
                style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                Cancel
              </button>
              <button type="submit" disabled={pending || validRows.length < 2}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-fg)' }}>
                {pending && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                {pending ? 'Saving…' : `Add ${validRows.length} split${validRows.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
