import { FormEvent, useState } from 'react';
import { useAddBucket } from '../hooks/useAddBucket';

export function AddCategoryForm() {
  const addBucket = useAddBucket();
  const [name, setName] = useState('');
  const [limit, setLimit] = useState('');

  function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    addBucket.mutate(
      { name: trimmed, monthlyLimit: parseFloat(limit) || 0 },
      {
        onSuccess: () => {
          setName('');
          setLimit('');
        },
      }
    );
  }

  const field =
    'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800';

  return (
    <form
      onSubmit={submit}
      className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="flex-1 min-w-[8rem]">
        <label className="mb-1 block text-xs font-medium text-slate-500">New category</label>
        <input
          className={`${field} w-full`}
          placeholder="e.g. Coffee"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="w-28">
        <label className="mb-1 block text-xs font-medium text-slate-500">Monthly limit</label>
        <input
          type="number"
          step="0.01"
          min="0"
          className={`${field} w-full`}
          placeholder="0.00"
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
        />
      </div>
      <button
        type="submit"
        disabled={addBucket.isPending || !name.trim()}
        className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
      >
        Add category
      </button>
    </form>
  );
}
