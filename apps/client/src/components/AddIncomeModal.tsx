import { FormEvent, useEffect, useRef, useState } from 'react';
import { X, DollarSign, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAddIncome } from '../hooks/useIncome';
import { todayInput } from '../lib/format';
import { Field } from './Field';

export function AddIncomeModal({ onClose }: { onClose: () => void }) {
  const addIncome = useAddIncome();
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('');
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
    if (!value || value <= 0) return;
    addIncome.mutate(
      { amount: value, source: source.trim() || 'Income', date },
      { onSuccess: () => onClose() }
    );
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
        style={{ backgroundColor: 'var(--color-surface)', boxShadow: '0 20px 60px rgb(0 0 0 / 0.3)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <h3 className="font-bold" style={{ color: 'var(--color-text)' }}>Add income</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>One-time payment — bonus, freelance, gift…</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:opacity-70" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
            <X size={15} />
          </button>
        </div>

        {/* Recurring hint */}
        <div className="mx-5 mt-4 flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
          <RefreshCw size={12} className="flex-shrink-0" />
          <span>For salary, freelance or weekly/bi-weekly income,</span>
          <Link to="/recurring" onClick={onClose} className="font-semibold underline underline-offset-2 flex-shrink-0" style={{ color: 'var(--color-primary)' }}>
            set up a recurring rule →
          </Link>
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

          {/* Source + Date */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Source" placeholder="Freelance, bonus…" value={source} onChange={(e) => setSource(e.target.value)} />
            <Field label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition hover:opacity-80" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
              Cancel
            </button>
            <button type="submit" disabled={addIncome.isPending || !amount}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: '#16a34a', color: '#ffffff' }}>
              {addIncome.isPending && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {addIncome.isPending ? 'Saving…' : 'Add income'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
