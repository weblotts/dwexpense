import { FormEvent, useState } from 'react';
import type { BucketWithSpend } from '@dwexpense/types';
import { useAddExpense } from '../hooks/useAddExpense';
import { todayInput } from '../lib/format';

interface Props {
  buckets: BucketWithSpend[];
  /** Lock the form to a single bucket (used on the bucket detail page). */
  fixedBucketId?: string;
}

export function ExpenseForm({ buckets, fixedBucketId }: Props) {
  const addExpense = useAddExpense();
  const [amount, setAmount] = useState('');
  const [bucketId, setBucketId] = useState(fixedBucketId ?? buckets[0]?._id ?? '');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayInput());

  function submit(e: FormEvent) {
    e.preventDefault();
    const value = parseFloat(amount);
    if (!value || value <= 0) return;
    const chosen = fixedBucketId ?? bucketId;
    if (!chosen) return;

    addExpense.mutate(
      { bucketId: chosen, amount: value, note: note.trim() || undefined, date },
      {
        onSuccess: () => {
          setAmount('');
          setNote('');
          setDate(todayInput());
        },
      }
    );
  }

  const field =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800';

  return (
    <form
      onSubmit={submit}
      className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:grid-cols-12"
    >
      <div className="col-span-1 sm:col-span-3">
        <label className="mb-1 block text-xs font-medium text-slate-500">Amount</label>
        <input
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          required
          autoFocus
          className={field}
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      {!fixedBucketId && (
        <div className="col-span-1 sm:col-span-3">
          <label className="mb-1 block text-xs font-medium text-slate-500">Bucket</label>
          <select className={field} value={bucketId} onChange={(e) => setBucketId(e.target.value)}>
            {buckets.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className={`col-span-2 ${fixedBucketId ? 'sm:col-span-5' : 'sm:col-span-3'}`}>
        <label className="mb-1 block text-xs font-medium text-slate-500">Note</label>
        <input
          className={field}
          placeholder="optional"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="col-span-1 sm:col-span-2">
        <label className="mb-1 block text-xs font-medium text-slate-500">Date</label>
        <input type="date" className={field} value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <div className="col-span-1 flex items-end sm:col-span-1">
        <button
          type="submit"
          disabled={addExpense.isPending}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </form>
  );
}
