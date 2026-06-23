import { FormEvent, useEffect, useRef, useState } from 'react';
import { X, DollarSign } from 'lucide-react';
import type { BucketWithSpend } from '@dwexpense/types';
import { useAddExpense } from '../hooks/useAddExpense';
import { todayInput, money } from '../lib/format';
import { Field } from './Field';

interface Props {
  buckets: BucketWithSpend[];
  onClose: () => void;
}

export function ExpenseModal({ buckets, onClose }: Props) {
  const addExpense = useAddExpense();
  const [amount, setAmount] = useState('');
  const [bucketId, setBucketId] = useState(buckets[0]?._id ?? '');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayInput());
  const amountRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setTimeout(() => amountRef.current?.focus(), 60); }, []);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  function submit(e: FormEvent) {
    e.preventDefault();
    const value = parseFloat(amount);
    if (!value || value <= 0 || !bucketId) return;
    addExpense.mutate(
      { bucketId, amount: value, note: note.trim() || undefined, date },
      { onSuccess: () => onClose() }
    );
  }

  const selectedBucket = buckets.find((b) => b._id === bucketId);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-t-2xl sm:rounded-2xl"
        style={{ backgroundColor: 'var(--color-surface)', boxShadow: '0 20px 60px rgb(0 0 0 / 0.3)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <h3 className="font-bold" style={{ color: 'var(--color-text)' }}>Add expense</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Record a new transaction</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:opacity-70" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
            <X size={15} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5 p-5">
          {/* Amount */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Amount</label>
            <div className="relative">
              <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-faint)' }} />
              <input
                ref={amountRef}
                type="number" step="0.01" min="0" required inputMode="decimal"
                placeholder="0.00"
                value={amount} onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl py-3 pl-9 pr-4 text-2xl font-bold"
                style={{ backgroundColor: 'var(--color-surface-2)', border: '1.5px solid var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Category</label>
            <div className="grid grid-cols-2 gap-2">
              {buckets.map((b) => (
                <button
                  key={b._id} type="button"
                  onClick={() => setBucketId(b._id)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-left transition"
                  style={{
                    border: `1.5px solid ${bucketId === b._id ? b.color : 'var(--color-border)'}`,
                    backgroundColor: bucketId === b._id ? `${b.color}18` : 'var(--color-surface-2)',
                    color: bucketId === b._id ? b.color : 'var(--color-text)',
                  }}
                >
                  <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: b.color }} />
                  <span className="truncate">{b.name}</span>
                </button>
              ))}
            </div>
            {selectedBucket && selectedBucket.monthlyLimit > 0 && (
              <div className="mt-2 flex items-center justify-between rounded-lg px-3 py-1.5 text-xs" style={{
                backgroundColor: selectedBucket.remaining < 0 ? 'rgba(220,38,38,0.08)' : 'var(--color-surface-2)',
                color: selectedBucket.remaining < 0 ? 'var(--color-error)' : 'var(--color-text-muted)',
              }}>
                <span>Budget: {money(selectedBucket.monthlyLimit)}</span>
                <span className="font-semibold">
                  {selectedBucket.remaining < 0 ? `${money(-selectedBucket.remaining)} over` : `${money(selectedBucket.remaining)} left`}
                </span>
              </div>
            )}
          </div>

          {/* Note + Date */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Note" placeholder="optional" value={note} onChange={(e) => setNote(e.target.value)} />
            <Field label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition hover:opacity-80" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
              Cancel
            </button>
            <button type="submit" disabled={addExpense.isPending || !amount || !bucketId}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-fg)' }}>
              {addExpense.isPending && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {addExpense.isPending ? 'Saving…' : 'Add expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
