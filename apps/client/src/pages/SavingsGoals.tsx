import { FormEvent, useEffect, useRef, useState } from 'react';
import { PiggyBank, Pencil, Trash2, Plus, X, Check, AlertTriangle, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSavingsGoals, useAddSavingsGoal, useUpdateSavingsGoal, useDeleteSavingsGoal } from '../hooks/useSavingsGoals';
import { money } from '../lib/format';
import { Field } from '../components/Field';
import type { SavingsGoal } from '@dwexpense/types';

const PRESET_COLORS = [
  '#EF4444','#F97316','#F59E0B','#EAB308',
  '#22C55E','#10B981','#06B6D4','#3B82F6',
  '#6366F1','#A855F7','#EC4899','#64748B',
];

const inp = 'w-full rounded-lg px-3 py-2 text-sm';

function deadlineBadge(deadline: string) {
  const d = new Date(deadline);
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

function daysUntil(deadline: string): number {
  const now = new Date();
  const d = new Date(deadline);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function SavingsGoals() {
  const { data: goals = [], isLoading } = useSavingsGoals();
  const addGoal = useAddSavingsGoal();
  const updateGoal = useUpdateSavingsGoal();
  const deleteGoal = useDeleteSavingsGoal();

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[5]);
  const [deadline, setDeadline] = useState('');

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editTarget, setEditTarget] = useState('');
  const [editCurrent, setEditCurrent] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editDeadline, setEditDeadline] = useState('');

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  // Add funds inline
  const [addFundsId, setAddFundsId] = useState<string | null>(null);
  const [fundsAmount, setFundsAmount] = useState('');

  function resetAddForm() {
    setName(''); setTarget(''); setCurrent(''); setColor(PRESET_COLORS[5]); setDeadline('');
  }

  function submitAdd(e: FormEvent) {
    e.preventDefault();
    const targetNum = parseFloat(target);
    if (!name.trim() || !targetNum) return;
    addGoal.mutate(
      { name: name.trim(), targetAmount: targetNum, currentAmount: parseFloat(current) || 0, color, deadline: deadline || undefined },
      { onSuccess: () => { setShowAddForm(false); resetAddForm(); toast.success('Goal created!'); } }
    );
  }

  function startEdit(g: SavingsGoal) {
    setEditId(g._id);
    setEditName(g.name);
    setEditTarget(String(g.targetAmount));
    setEditCurrent(String(g.currentAmount));
    setEditColor(g.color);
    setEditDeadline(g.deadline ? g.deadline.slice(0, 10) : '');
  }

  function submitEdit(id: string) {
    updateGoal.mutate(
      { id, input: { name: editName.trim(), targetAmount: parseFloat(editTarget) || 0, currentAmount: parseFloat(editCurrent) || 0, color: editColor, deadline: editDeadline || undefined } },
      { onSuccess: () => { setEditId(null); toast.success('Goal updated!'); } }
    );
  }

  function submitAddFunds(goal: SavingsGoal) {
    const amt = parseFloat(fundsAmount);
    if (!amt || amt <= 0) return;
    updateGoal.mutate(
      { id: goal._id, input: { currentAmount: goal.currentAmount + amt } },
      { onSuccess: () => { setAddFundsId(null); setFundsAmount(''); toast.success(`Added ${money(amt)} to ${goal.name}`); } }
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Savings Goals</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Track your progress toward financial targets</p>
        </div>
        <button
          onClick={() => { setShowAddForm((v) => !v); resetAddForm(); }}
          className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition hover:opacity-90"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-fg)' }}
        >
          <Plus size={14} /> Add goal
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <form onSubmit={submitAdd} className="rounded-xl p-5 space-y-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>New savings goal</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field required label="Goal name" placeholder="e.g. Emergency fund" value={name} onChange={(e) => setName(e.target.value)} />
            <Field required type="number" step="0.01" min="0" label="Target amount" placeholder="0.00" value={target} onChange={(e) => setTarget(e.target.value)} />
            <Field type="number" step="0.01" min="0" label="Current amount (optional)" placeholder="0.00" value={current} onChange={(e) => setCurrent(e.target.value)} />
            <Field type="date" label="Deadline (optional)" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Color</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`h-6 w-6 rounded-full transition ${color === c ? 'ring-2 ring-offset-1' : ''}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => { setShowAddForm(false); resetAddForm(); }}
              className="flex-1 rounded-xl py-2 text-sm font-semibold transition hover:opacity-80"
              style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
              Cancel
            </button>
            <button type="submit" disabled={addGoal.isPending || !name.trim() || !target}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-fg)' }}>
              {addGoal.isPending && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              Save goal
            </button>
          </div>
        </form>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl" style={{ backgroundColor: 'var(--color-surface-2)' }} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && goals.length === 0 && (
        <div className="rounded-xl border border-dashed p-12 text-center" style={{ borderColor: 'var(--color-border)' }}>
          <PiggyBank size={32} className="mx-auto mb-3" style={{ color: 'var(--color-text-faint)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>No savings goals yet.</p>
          <p className="mt-1 text-xs" style={{ color: 'var(--color-text-faint)' }}>Add your first goal to start tracking.</p>
        </div>
      )}

      {/* Goal cards grid */}
      {!isLoading && goals.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {goals.map((goal) => {
            const pct = goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0;
            const isEditing = editId === goal._id;
            const days = goal.deadline ? daysUntil(goal.deadline) : null;

            if (isEditing) {
              return (
                <div key={goal._id} className="rounded-2xl p-5 space-y-3" style={{ backgroundColor: 'var(--color-surface)', border: `1.5px solid ${editColor}` }}>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Edit goal</p>
                  <Field required value={editName} onChange={(e) => setEditName(e.target.value)} />
                  <div className="grid grid-cols-2 gap-2">
                    <Field type="number" step="0.01" min="0" placeholder="Target" value={editTarget} onChange={(e) => setEditTarget(e.target.value)} />
                    <Field type="number" step="0.01" min="0" placeholder="Current" value={editCurrent} onChange={(e) => setEditCurrent(e.target.value)} />
                  </div>
                  <Field type="date" value={editDeadline} onChange={(e) => setEditDeadline(e.target.value)} />
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_COLORS.map((c) => (
                      <button key={c} type="button" onClick={() => setEditColor(c)}
                        className={`h-5 w-5 rounded-full transition ${editColor === c ? 'ring-2 ring-offset-1' : ''}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => submitEdit(goal._id)} disabled={updateGoal.isPending}
                      className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-fg)' }}>
                      <Check size={11} /> Save
                    </button>
                    <button onClick={() => setEditId(null)}
                      className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs transition hover:opacity-80"
                      style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                      <X size={11} /> Cancel
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div key={goal._id} className="rounded-2xl p-5 space-y-3" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                {/* Title row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: goal.color }} />
                    <span className="font-semibold truncate" style={{ color: 'var(--color-text)' }}>{goal.name}</span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => startEdit(goal)} className="rounded-lg p-1.5 transition hover:opacity-70" style={{ color: 'var(--color-text-faint)' }}>
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setDeleteTarget({ id: goal._id, name: goal.name })} className="rounded-lg p-1.5 transition hover:opacity-70" style={{ color: 'var(--color-error)' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--color-surface-2)' }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: goal.color }} />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-xs">
                    <span style={{ color: 'var(--color-text-muted)' }}>{money(goal.currentAmount)} of {money(goal.targetAmount)}</span>
                    <span className="font-semibold" style={{ color: goal.color }}>{pct.toFixed(0)}%</span>
                  </div>
                </div>

                {/* Deadline + days */}
                {goal.deadline && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: `${goal.color}18`, color: goal.color }}>
                      <Calendar size={10} /> {deadlineBadge(goal.deadline)}
                    </span>
                    {days !== null && (
                      <span className="text-xs" style={{ color: days < 0 ? 'var(--color-error)' : 'var(--color-text-faint)' }}>
                        {days < 0 ? `${Math.abs(days)} days overdue` : `${days} days left`}
                      </span>
                    )}
                  </div>
                )}

                {/* Add funds */}
                {addFundsId === goal._id ? (
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      type="number" step="0.01" min="0"
                      className="flex-1 rounded-lg px-3 py-1.5 text-sm"
                      placeholder="Amount to add"
                      value={fundsAmount}
                      onChange={(e) => setFundsAmount(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') submitAddFunds(goal); if (e.key === 'Escape') { setAddFundsId(null); setFundsAmount(''); } }}
                      style={{ backgroundColor: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)', color: 'var(--color-input-text)' }}
                    />
                    <button onClick={() => submitAddFunds(goal)} disabled={updateGoal.isPending}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:opacity-90"
                      style={{ backgroundColor: goal.color, color: '#fff' }}>
                      Add
                    </button>
                    <button onClick={() => { setAddFundsId(null); setFundsAmount(''); }}
                      className="rounded-lg px-2 py-1.5 text-xs transition"
                      style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setAddFundsId(goal._id); setFundsAmount(''); }}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition hover:opacity-80"
                    style={{ backgroundColor: `${goal.color}15`, color: goal.color, border: `1px solid ${goal.color}40` }}>
                    <Plus size={11} /> Add funds
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteTarget && (
        <ConfirmDeleteModal
          name={deleteTarget.name}
          isPending={deleteGoal.isPending}
          onConfirm={() => deleteGoal.mutate(deleteTarget.id, { onSuccess: () => { setDeleteTarget(null); toast.success('Goal deleted'); } })}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

function ConfirmDeleteModal({ name, isPending, onConfirm, onCancel }: {
  name: string; isPending: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancelRef.current?.focus();
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.currentTarget === e.target) onCancel(); }}>
      <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(220,38,38,0.1)' }}>
          <AlertTriangle size={20} style={{ color: 'var(--color-error)' }} />
        </div>
        <h3 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>Delete "{name}"?</h3>
        <p className="mt-1.5 text-sm" style={{ color: 'var(--color-text-muted)' }}>This will permanently delete this savings goal. This cannot be undone.</p>
        <div className="mt-5 flex gap-3">
          <button ref={cancelRef} onClick={onCancel}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition hover:opacity-80"
            style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={isPending}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-error)', color: '#fff' }}>
            {isPending && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {isPending ? 'Deleting…' : 'Yes, delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
