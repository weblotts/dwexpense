import { FormEvent, useState } from 'react';
import { useAddIncome } from '../hooks/useIncome';
import { todayInput } from '../lib/format';

export function AddIncomeForm() {
  const addIncome = useAddIncome();
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('');

  function submit(e: FormEvent) {
    e.preventDefault();
    const value = parseFloat(amount);
    if (!value || value <= 0) return;
    addIncome.mutate(
      { amount: value, source: source.trim() || 'Income', date: todayInput() },
      {
        onSuccess: () => {
          setAmount('');
          setSource('');
        },
      }
    );
  }

  const field =
    'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800';

  return (
    <form
      onSubmit={submit}
      className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="w-32">
        <label className="mb-1 block text-xs font-medium text-slate-500">Extra income</label>
        <input
          type="number"
          step="0.01"
          min="0"
          className={`${field} w-full`}
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <div className="flex-1 min-w-[8rem]">
        <label className="mb-1 block text-xs font-medium text-slate-500">Source</label>
        <input
          className={`${field} w-full`}
          placeholder="e.g. Freelance, bonus"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        />
      </div>
      <button
        type="submit"
        disabled={addIncome.isPending || !amount}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
      >
        Add income
      </button>
    </form>
  );
}
