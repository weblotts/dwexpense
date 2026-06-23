import { FormEvent, useEffect, useRef, useState, useCallback } from 'react';
import { Plus, Repeat2, ExternalLink, Pencil, Trash2, Check, X, CirclePause, CirclePlay, AlertTriangle, DollarSign } from 'lucide-react';
import type { Recurring, RecurringType, RecurringFrequency, UpdateRecurringInput } from '@dwexpense/types';
import { useBuckets } from '../hooks/useBuckets';
import {
  useRecurring,
  useAddRecurring,
  useUpdateRecurring,
  useDeleteRecurring,
} from '../hooks/useRecurring';
import { useApplyRecurring } from '../hooks/useApplyRecurring';
import { useMigrateSubscriptions } from '../hooks/useMigrate';
import { money } from '../lib/format';

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const FREQ_LABELS: Record<RecurringFrequency, string> = {
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
};

interface EditState {
  amount: string; bucketId: string; source: string;
  serviceName: string; url: string; note: string;
  dayOfMonth: string; dayOfWeek: string; frequency: RecurringFrequency; active: boolean;
  reminderDays: string;
}

function ruleToEdit(r: Recurring): EditState {
  return {
    amount: String(r.amount), bucketId: r.bucketId ?? '', source: r.source ?? '',
    serviceName: r.serviceName ?? '', url: r.url ?? '', note: r.note ?? '',
    dayOfMonth: String(r.dayOfMonth), dayOfWeek: r.dayOfWeek != null ? String(r.dayOfWeek) : '',
    frequency: r.frequency ?? 'monthly', active: r.active,
    reminderDays: String(r.reminderDays ?? 0),
  };
}

const inp = 'w-full rounded-lg px-3 py-2 text-sm';

export function Recurring() {
  const { data: buckets } = useBuckets();
  const { data: rules, isLoading } = useRecurring();
  const addRule = useAddRecurring();
  const updateRule = useUpdateRecurring();
  const deleteRule = useDeleteRecurring();
  const apply = useApplyRecurring();
  const migrate = useMigrateSubscriptions();

  const [type, setType] = useState<RecurringType>('expense');
  const [amount, setAmount] = useState('');
  const [bucketId, setBucketId] = useState('');
  const [source, setSource] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [day, setDay] = useState('1');
  const [dayOfWeek, setDayOfWeek] = useState('5'); // default Friday
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [reminderDays, setReminderDays] = useState('0');
  const [editId, setEditId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [bannerHidden, setBannerHidden] = useState(() => localStorage.getItem('migrate-banner-dismissed') === '1');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);

  const dismissBanner = useCallback(() => {
    localStorage.setItem('migrate-banner-dismissed', '1');
    setBannerHidden(true);
  }, []);

  function submitAdd(e: FormEvent) {
    e.preventDefault();
    const value = parseFloat(amount);
    if (!value || value <= 0) return;
    addRule.mutate(
      {
        type, frequency, amount: value,
        bucketId: type === 'expense' ? bucketId || buckets?.[0]?._id : undefined,
        source: type === 'income' ? source.trim() || 'Income' : undefined,
        serviceName: serviceName.trim() || undefined,
        url: url.trim() || undefined,
        note: note.trim() || undefined,
        dayOfMonth: frequency === 'monthly' ? parseInt(day, 10) || 1 : 1,
        dayOfWeek: frequency !== 'monthly' && dayOfWeek !== '' ? parseInt(dayOfWeek, 10) : undefined,
        reminderDays: type === 'expense' && frequency === 'monthly' ? parseInt(reminderDays, 10) || 0 : undefined,
      },
      { onSuccess: () => { setAmount(''); setNote(''); setSource(''); setServiceName(''); setUrl(''); setReminderDays('0'); } }
    );
  }

  function startEdit(r: Recurring) { setEditId(r._id); setEditState(ruleToEdit(r)); }
  function saveEdit(r: Recurring) {
    if (!editState) return;
    const input: UpdateRecurringInput = {
      frequency: editState.frequency,
      amount: parseFloat(editState.amount) || r.amount,
      bucketId: r.type === 'expense' ? editState.bucketId || undefined : undefined,
      source: r.type === 'income' ? editState.source.trim() || undefined : undefined,
      serviceName: editState.serviceName.trim() || undefined,
      url: editState.url.trim() || undefined,
      note: editState.note.trim() || undefined,
      dayOfMonth: editState.frequency === 'monthly' ? parseInt(editState.dayOfMonth, 10) || r.dayOfMonth : 1,
      dayOfWeek: editState.frequency !== 'monthly' && editState.dayOfWeek !== '' ? parseInt(editState.dayOfWeek, 10) : undefined,
      active: editState.active,
      reminderDays: r.type === 'expense' && editState.frequency === 'monthly' ? parseInt(editState.reminderDays, 10) || 0 : undefined,
    };
    updateRule.mutate({ id: r._id, input }, { onSuccess: () => setEditId(null) });
  }

  const bucketName = (id?: string) => buckets?.find((b) => b._id === id)?.name ?? '—';
  const toMonthly = (r: Recurring) =>
    r.frequency === 'weekly' ? r.amount * 4 : r.frequency === 'biweekly' ? r.amount * 2 : r.amount;
  const monthlyBills = rules?.filter((r) => r.type === 'expense' && r.active).reduce((s, r) => s + toMonthly(r), 0) ?? 0;
  const monthlyIncome = rules?.filter((r) => r.type === 'income' && r.active).reduce((s, r) => s + toMonthly(r), 0) ?? 0;
  const bills = rules?.filter((r) => r.type === 'expense') ?? [];
  const incomeRules = rules?.filter((r) => r.type === 'income') ?? [];

  return (
    <div className="space-y-6">
      {/* Migration banner */}
      {!bannerHidden && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Import old subscriptions</p>
            <p className="text-xs text-amber-600 dark:text-amber-400">Your subscriptions have been merged into Recurring. Click to import them.</p>
          </div>
          <button onClick={() => migrate.mutate(undefined, { onSuccess: dismissBanner })} disabled={migrate.isPending}
            className="flex-shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50">
            {migrate.isPending ? 'Importing…' : 'Import now'}
          </button>
          <button onClick={dismissBanner} className="flex-shrink-0 rounded-lg p-1 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-base-content">Recurring</h1>
          <p className="text-sm text-base-content/50">Bills, subscriptions, and income that repeat monthly</p>
        </div>
        <div className="flex items-center gap-4">
          {monthlyBills > 0 && (
            <div className="text-right">
              <p className="text-xs text-base-content/40">Monthly bills</p>
              <p className="font-bold text-red-500">{money(monthlyBills)}</p>
            </div>
          )}
          {monthlyIncome > 0 && (
            <div className="text-right">
              <p className="text-xs text-base-content/40">Monthly income</p>
              <p className="font-bold text-emerald-500">{money(monthlyIncome)}</p>
            </div>
          )}
          <button onClick={() => apply.mutate()} disabled={apply.isPending}
            className="flex items-center gap-1.5 rounded-lg border border-base-300 bg-base-100 px-3 py-1.5 text-sm font-medium text-base-content/70 hover:bg-base-200 disabled:opacity-50 transition">
            <Repeat2 size={13} className={apply.isPending ? 'animate-spin' : ''} />
            {apply.isPending ? 'Applying…' : 'Apply due now'}
          </button>
        </div>
      </div>

      {/* Add form */}
      <div className="rounded-xl border border-base-300 bg-base-100 p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-base-content">Add rule</h2>
        <form onSubmit={submitAdd} className="space-y-4">
          <div className="flex gap-2">
            {(['expense', 'income'] as RecurringType[]).map((t) => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                  type === t
                    ? t === 'expense' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'border border-base-300 text-base-content/50 hover:bg-base-200'
                }`}>
                {t === 'expense' ? 'Bill / Subscription' : 'Income'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="mb-1 block text-xs font-medium text-base-content/60">
                {type === 'expense' ? 'Service / Bill name' : 'Source'}
              </label>
              {type === 'expense'
                ? <input className={inp} placeholder="Netflix, Rent…" value={serviceName} onChange={(e) => setServiceName(e.target.value)} />
                : <input className={inp} placeholder="Salary, Freelance…" value={source} onChange={(e) => setSource(e.target.value)} />}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-base-content/60">Amount</label>
              <div className="relative">
                <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
                <input type="number" step="0.01" min="0" required className={`${inp} pl-7`}
                  value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
            </div>
            {type === 'expense' && (
              <div>
                <label className="mb-1 block text-xs font-medium text-base-content/60">Category</label>
                <select className={inp} value={bucketId} onChange={(e) => setBucketId(e.target.value)}>
                  {buckets?.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-base-content/60">Frequency</label>
              <select className={inp} value={frequency} onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}>
                {(Object.keys(FREQ_LABELS) as RecurringFrequency[]).map((f) => (
                  <option key={f} value={f}>{FREQ_LABELS[f]}</option>
                ))}
              </select>
            </div>
            {frequency === 'monthly' && (
              <div>
                <label className="mb-1 block text-xs font-medium text-base-content/60">Day of month</label>
                <input type="number" min="1" max="28" className={inp} value={day} onChange={(e) => setDay(e.target.value)} />
              </div>
            )}
            {(frequency === 'weekly' || frequency === 'biweekly') && (
              <div>
                <label className="mb-1 block text-xs font-medium text-base-content/60">Day of week</label>
                <select className={inp} value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)}>
                  <option value="0">Sunday</option>
                  <option value="1">Monday</option>
                  <option value="2">Tuesday</option>
                  <option value="3">Wednesday</option>
                  <option value="4">Thursday</option>
                  <option value="5">Friday</option>
                  <option value="6">Saturday</option>
                </select>
              </div>
            )}
            {type === 'expense' && frequency === 'monthly' && (
              <div>
                <label className="mb-1 block text-xs font-medium text-base-content/60">Reminder (days before due)</label>
                <input type="number" min="0" max="14" className={inp} value={reminderDays} onChange={(e) => setReminderDays(e.target.value)} />
              </div>
            )}
            {type === 'expense' && (
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-base-content/60">URL <span className="opacity-50">(optional)</span></label>
                <input type="url" className={inp} placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
              </div>
            )}
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-base-content/60">Note <span className="opacity-50">(optional)</span></label>
              <input className={inp} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>

          <button type="submit" disabled={addRule.isPending}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-content hover:opacity-90 disabled:opacity-50 transition">
            {addRule.isPending ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Plus size={13} />}
            Add
          </button>
        </form>
      </div>

      {/* Lists */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : !rules || rules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-base-300 p-10 text-center text-sm text-base-content/40">
          No recurring rules yet. Add your salary, rent, Netflix above.
        </div>
      ) : (
        <div className="space-y-4">
          {bills.length > 0 && (
            <RuleSection title="Bills & subscriptions" rules={bills}
              editId={editId} editState={editState} setEditState={setEditState}
              buckets={buckets} bucketName={bucketName}
              onEdit={startEdit} onSave={saveEdit} onCancel={() => setEditId(null)}
              onRequestDelete={(id, label) => setDeleteTarget({ id, label })}
              onToggle={(r) => updateRule.mutate({ id: r._id, input: { active: !r.active } })}
              isSaving={updateRule.isPending} />
          )}
          {incomeRules.length > 0 && (
            <RuleSection title="Income" rules={incomeRules}
              editId={editId} editState={editState} setEditState={setEditState}
              buckets={buckets} bucketName={bucketName}
              onEdit={startEdit} onSave={saveEdit} onCancel={() => setEditId(null)}
              onRequestDelete={(id, label) => setDeleteTarget({ id, label })}
              onToggle={(r) => updateRule.mutate({ id: r._id, input: { active: !r.active } })}
              isSaving={updateRule.isPending} />
          )}
        </div>
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          label={deleteTarget.label}
          isPending={deleteRule.isPending}
          onConfirm={() => deleteRule.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

function DeleteConfirmModal({ label, isPending, onConfirm, onCancel }: {
  label: string; isPending: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancelRef.current?.focus();
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.currentTarget === e.target) onCancel(); }}
    >
      <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full"
          style={{ backgroundColor: 'rgba(220,38,38,0.1)' }}>
          <AlertTriangle size={20} style={{ color: 'var(--color-error)' }} />
        </div>
        <h3 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>Delete "{label}"?</h3>
        <p className="mt-1.5 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          This recurring rule will be permanently removed. Future entries won't be applied, but past ones stay in your history.
        </p>
        <div className="mt-5 flex gap-3">
          <button ref={cancelRef} onClick={onCancel}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition hover:opacity-80"
            style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={isPending}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-error)', color: '#ffffff' }}>
            {isPending && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {isPending ? 'Deleting…' : 'Yes, delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RuleSection({ title, rules, editId, editState, setEditState, buckets, bucketName, onEdit, onSave, onCancel, onRequestDelete, onToggle, isSaving }: {
  title: string; rules: Recurring[]; editId: string | null; editState: EditState | null;
  setEditState: (s: EditState) => void; buckets: { _id: string; name: string }[] | undefined;
  bucketName: (id?: string) => string; onEdit: (r: Recurring) => void; onSave: (r: Recurring) => void;
  onCancel: () => void; onRequestDelete: (id: string, label: string) => void; onToggle: (r: Recurring) => void; isSaving: boolean;
}) {
  const inp2 = 'w-full rounded-lg px-2 py-1.5 text-sm';
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-content/40">{title}</p>
      <ul className="overflow-hidden rounded-xl border border-base-300 bg-base-100">
        {rules.map((r) =>
          editId === r._id && editState ? (
            <li key={r._id} className="border-b border-base-200 bg-primary/5 px-4 py-3 last:border-0">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div>
                  <label className="mb-0.5 block text-xs text-base-content/50">{r.type === 'expense' ? 'Service name' : 'Source'}</label>
                  {r.type === 'expense'
                    ? <input className={inp2} value={editState.serviceName} onChange={(e) => setEditState({ ...editState, serviceName: e.target.value })} />
                    : <input className={inp2} value={editState.source} onChange={(e) => setEditState({ ...editState, source: e.target.value })} />}
                </div>
                <div>
                  <label className="mb-0.5 block text-xs text-base-content/50">Amount</label>
                  <input type="number" step="0.01" min="0" className={inp2} value={editState.amount} onChange={(e) => setEditState({ ...editState, amount: e.target.value })} />
                </div>
                {r.type === 'expense' && (
                  <div>
                    <label className="mb-0.5 block text-xs text-base-content/50">Category</label>
                    <select className={inp2} value={editState.bucketId} onChange={(e) => setEditState({ ...editState, bucketId: e.target.value })}>
                      {buckets?.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="mb-0.5 block text-xs text-base-content/50">Frequency</label>
                  <select className={inp2} value={editState.frequency} onChange={(e) => setEditState({ ...editState, frequency: e.target.value as RecurringFrequency })}>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                {editState.frequency === 'monthly' && (
                  <div>
                    <label className="mb-0.5 block text-xs text-base-content/50">Day</label>
                    <input type="number" min="1" max="28" className={inp2} value={editState.dayOfMonth} onChange={(e) => setEditState({ ...editState, dayOfMonth: e.target.value })} />
                  </div>
                )}
                {(editState.frequency === 'weekly' || editState.frequency === 'biweekly') && (
                  <div>
                    <label className="mb-0.5 block text-xs text-base-content/50">Day of week</label>
                    <select className={inp2} value={editState.dayOfWeek} onChange={(e) => setEditState({ ...editState, dayOfWeek: e.target.value })}>
                      <option value="0">Sunday</option>
                      <option value="1">Monday</option>
                      <option value="2">Tuesday</option>
                      <option value="3">Wednesday</option>
                      <option value="4">Thursday</option>
                      <option value="5">Friday</option>
                      <option value="6">Saturday</option>
                    </select>
                  </div>
                )}
                {r.type === 'expense' && editState.frequency === 'monthly' && (
                  <div>
                    <label className="mb-0.5 block text-xs text-base-content/50">Reminder (days before due)</label>
                    <input type="number" min="0" max="14" className={inp2} value={editState.reminderDays} onChange={(e) => setEditState({ ...editState, reminderDays: e.target.value })} />
                  </div>
                )}
                {r.type === 'expense' && (
                  <div className="col-span-2">
                    <label className="mb-0.5 block text-xs text-base-content/50">URL</label>
                    <input type="url" className={inp2} value={editState.url} onChange={(e) => setEditState({ ...editState, url: e.target.value })} />
                  </div>
                )}
                <div className="col-span-2">
                  <label className="mb-0.5 block text-xs text-base-content/50">Note</label>
                  <input className={inp2} value={editState.note} onChange={(e) => setEditState({ ...editState, note: e.target.value })} />
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button disabled={isSaving} onClick={() => onSave(r)}
                  className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-content hover:opacity-90 disabled:opacity-50">
                  <Check size={11} /> Save
                </button>
                <button onClick={onCancel}
                  className="flex items-center gap-1 rounded-lg border border-base-300 px-3 py-1.5 text-xs text-base-content/60 hover:bg-base-200">
                  <X size={11} /> Cancel
                </button>
              </div>
            </li>
          ) : (
            <li key={r._id} className={`flex items-center justify-between gap-3 border-b border-base-200 px-4 py-3 last:border-0 ${!r.active ? 'opacity-50' : ''}`}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    r.type === 'income'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                  }`}>
                    {r.type === 'income' ? 'Income' : 'Bill'}
                  </span>
                  <span className="font-medium text-base-content truncate">
                    {r.serviceName || (r.type === 'income' ? r.source : bucketName(r.bucketId))}
                  </span>
                  {r.url && (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:opacity-70">
                      <ExternalLink size={12} />
                    </a>
                  )}
                  {!r.active && <span className="rounded-full bg-base-200 px-2 py-0.5 text-xs text-base-content/40">Paused</span>}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-base-content/40">
                  <span className="font-semibold text-base-content/70">
                    {money(r.amount)}/{r.frequency === 'weekly' ? 'wk' : r.frequency === 'biweekly' ? '2wk' : 'mo'}
                  </span>
                  <span>{FREQ_LABELS[r.frequency ?? 'monthly']}{r.frequency === 'monthly' ? ` · ${ordinal(r.dayOfMonth)}` : r.dayOfWeek != null ? ` · ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][r.dayOfWeek]}` : ''}</span>
                  {r.type === 'expense' && r.serviceName && <span>{bucketName(r.bucketId)}</span>}
                  {r.note && <span>· {r.note}</span>}
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1">
                <button onClick={() => onToggle(r)} title={r.active ? 'Pause' : 'Resume'}
                  className="rounded-lg p-1.5 text-base-content/30 hover:bg-base-200 hover:text-base-content transition">
                  {r.active ? <CirclePause size={14} /> : <CirclePlay size={14} className="text-emerald-500" />}
                </button>
                <button onClick={() => onEdit(r)}
                  className="rounded-lg p-1.5 text-base-content/30 hover:bg-base-200 hover:text-primary transition">
                  <Pencil size={13} />
                </button>
                <button onClick={() => onRequestDelete(r._id, r.serviceName || r.source || bucketName(r.bucketId))}
                  className="rounded-lg p-1.5 text-base-content/30 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950 transition">
                  <Trash2 size={13} />
                </button>
              </div>
            </li>
          )
        )}
      </ul>
    </div>
  );
}
