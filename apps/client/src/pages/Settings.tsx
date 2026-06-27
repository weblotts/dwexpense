import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  User, DollarSign, PiggyBank, Tag, Trash2, Pencil, Check, X,
  Plus, AlertTriangle, Lock, Mail, ShieldAlert, LayoutTemplate, GripVertical, Link2, Link2Off,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useUpdateProfile } from '../hooks/useUpdateProfile';
import { useAddBucket } from '../hooks/useAddBucket';
import { useUpdateBucket, useDeleteBucket, useSeedBuckets } from '../hooks/useBucketMutations';
import { useBuckets } from '../hooks/useBuckets';
import { useBudgetTemplates, useApplyTemplate, useDeleteTemplate, useSaveCurrentAsTemplate } from '../hooks/useBudgetTemplates';
import { api, apiErrorMessage } from '../lib/api';
import { GoogleButton } from '../components/GoogleButton';
import { money, setCurrency, getCurrency } from '../lib/format';
import { Field } from '../components/Field';

const CURRENCIES = [
  { code: 'USD', label: 'USD — US Dollar ($)' },
  { code: 'EUR', label: 'EUR — Euro (€)' },
  { code: 'GBP', label: 'GBP — British Pound (£)' },
  { code: 'CAD', label: 'CAD — Canadian Dollar (CA$)' },
  { code: 'AUD', label: 'AUD — Australian Dollar (A$)' },
  { code: 'JPY', label: 'JPY — Japanese Yen (¥)' },
  { code: 'CHF', label: 'CHF — Swiss Franc (CHF)' },
  { code: 'INR', label: 'INR — Indian Rupee (₹)' },
  { code: 'CNY', label: 'CNY — Chinese Yuan (¥)' },
  { code: 'BRL', label: 'BRL — Brazilian Real (R$)' },
  { code: 'MXN', label: 'MXN — Mexican Peso (MX$)' },
  { code: 'ZAR', label: 'ZAR — South African Rand (R)' },
  { code: 'NGN', label: 'NGN — Nigerian Naira (₦)' },
  { code: 'KES', label: 'KES — Kenyan Shilling (KSh)' },
  { code: 'UGX', label: 'UGX — Ugandan Shilling (USh)' },
  { code: 'GHS', label: 'GHS — Ghanaian Cedi (₵)' },
  { code: 'EGP', label: 'EGP — Egyptian Pound (E£)' },
  { code: 'AED', label: 'AED — UAE Dirham (د.إ)' },
  { code: 'SAR', label: 'SAR — Saudi Riyal (﷼)' },
  { code: 'SGD', label: 'SGD — Singapore Dollar (S$)' },
  { code: 'NZD', label: 'NZD — New Zealand Dollar (NZ$)' },
  { code: 'SEK', label: 'SEK — Swedish Krona (kr)' },
  { code: 'NOK', label: 'NOK — Norwegian Krone (kr)' },
  { code: 'DKK', label: 'DKK — Danish Krone (kr)' },
  { code: 'PLN', label: 'PLN — Polish Złoty (zł)' },
  { code: 'TRY', label: 'TRY — Turkish Lira (₺)' },
  { code: 'IDR', label: 'IDR — Indonesian Rupiah (Rp)' },
  { code: 'PHP', label: 'PHP — Philippine Peso (₱)' },
  { code: 'MYR', label: 'MYR — Malaysian Ringgit (RM)' },
  { code: 'THB', label: 'THB — Thai Baht (฿)' },
];

const PRESET_COLORS = [
  '#EF4444','#F97316','#F59E0B','#EAB308',
  '#22C55E','#10B981','#06B6D4','#3B82F6',
  '#6366F1','#A855F7','#EC4899','#64748B',
];

type PayFreq = 'weekly' | 'biweekly' | 'monthly';
const inp = 'w-full rounded-lg px-3 py-2 text-sm';

export function Settings() {
  const { user, setUser, logout } = useAuth();
  const update = useUpdateProfile();
  const { data: buckets } = useBuckets();
  const addBucket = useAddBucket();
  const updateBucket = useUpdateBucket();
  const deleteBucket = useDeleteBucket();
  const seedBuckets = useSeedBuckets();

  // ── Profile & budget ────────────────────────────────────────────
  const [name, setName] = useState(user?.name ?? '');
  const [currency, setCurrencyState] = useState(user?.currency ?? getCurrency());
  const [payFreq, setPayFreq] = useState<PayFreq>(
    () => (localStorage.getItem('payFreq') as PayFreq | null) ?? 'monthly'
  );
  const [payAmount, setPayAmount] = useState('');
  const [savings, setSavings] = useState('');

  // Convert stored monthly salary back to the user's preferred frequency for display
  function monthlyToFreq(monthly: number, freq: PayFreq) {
    if (freq === 'weekly') return monthly * 12 / 52;
    if (freq === 'biweekly') return monthly * 12 / 26;
    return monthly;
  }

  // Sync form once when user first loads — never overwrite after that
  const synced = useRef(false);
  useEffect(() => {
    if (!user || synced.current) return;
    synced.current = true;
    const storedFreq = (localStorage.getItem('payFreq') as PayFreq | null) ?? 'monthly';
    setName(user.name ?? '');
    setSavings(String(user.savingsGoal ?? 0));
    setCurrencyState(user.currency ?? getCurrency());
    setPayFreq(storedFreq);
    const displayAmount = monthlyToFreq(user.monthlySalary ?? 0, storedFreq);
    setPayAmount(String(Math.round(displayAmount * 100) / 100));
  }, [user]);

  // When frequency changes, convert the current displayed amount to the new frequency
  function handleFreqChange(newFreq: PayFreq) {
    const currentMonthly =
      payFreq === 'weekly' ? (parseFloat(payAmount) || 0) * 52 / 12 :
      payFreq === 'biweekly' ? (parseFloat(payAmount) || 0) * 26 / 12 :
      parseFloat(payAmount) || 0;
    const newDisplay = monthlyToFreq(currentMonthly, newFreq);
    setPayFreq(newFreq);
    setPayAmount(String(Math.round(newDisplay * 100) / 100));
    localStorage.setItem('payFreq', newFreq);
  }

  const payNum = parseFloat(payAmount) || 0;
  const salaryNum =
    payFreq === 'weekly' ? payNum * 52 / 12 :
    payFreq === 'biweekly' ? payNum * 26 / 12 :
    payNum;

  function submitProfile(e: FormEvent) {
    e.preventDefault();
    setCurrency(currency); // apply immediately for instant feedback
    update.mutate({ name: name.trim(), monthlySalary: salaryNum, savingsGoal: parseFloat(savings) || 0, currency });
  }

  // ── Categories ──────────────────────────────────────────────────
  const [newName, setNewName] = useState('');
  const [newLimit, setNewLimit] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[5]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLimit, setEditLimit] = useState('');
  const [editColor, setEditColor] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  // ── Drag-to-reorder ─────────────────────────────────────────────
  const [bucketOrder, setBucketOrder] = useState<string[]>([]);
  const dragIndex = useRef<number | null>(null);

  useEffect(() => {
    if (buckets && buckets.length > 0 && bucketOrder.length === 0) {
      setBucketOrder(buckets.map((b) => b._id));
    }
  }, [buckets, bucketOrder.length]);

  const orderedBuckets = bucketOrder.length > 0 && buckets
    ? bucketOrder.map((id) => buckets.find((b) => b._id === id)).filter(Boolean) as typeof buckets
    : (buckets ?? []);

  function handleDragStart(index: number) {
    dragIndex.current = index;
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(dropIndex: number) {
    const from = dragIndex.current;
    if (from === null || from === dropIndex) return;
    const next = [...bucketOrder];
    const [moved] = next.splice(from, 1);
    next.splice(dropIndex, 0, moved);
    setBucketOrder(next);
    dragIndex.current = null;
  }

  function submitNewCategory(e: FormEvent) {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    addBucket.mutate(
      { name: trimmed, monthlyLimit: parseFloat(newLimit) || 0, color: newColor },
      { onSuccess: () => { setNewName(''); setNewLimit(''); setNewColor(PRESET_COLORS[5]); } }
    );
  }

  function startEdit(b: { _id: string; name: string; monthlyLimit: number; color: string }) {
    setEditId(b._id); setEditName(b.name); setEditLimit(String(b.monthlyLimit)); setEditColor(b.color);
  }

  function saveEdit(id: string) {
    updateBucket.mutate(
      { id, input: { name: editName.trim(), monthlyLimit: parseFloat(editLimit) || 0, color: editColor } },
      { onSuccess: () => setEditId(null) }
    );
  }

  // ── Budget templates ────────────────────────────────────────────
  const { data: templates } = useBudgetTemplates();
  const applyTemplate = useApplyTemplate();
  const deleteTemplate = useDeleteTemplate();
  const saveAsTemplate = useSaveCurrentAsTemplate();
  const [confirmApplyId, setConfirmApplyId] = useState<string | null>(null);
  const [showSaveName, setShowSaveName] = useState(false);
  const [saveName, setSaveName] = useState('');

  async function handleSaveAsTemplate() {
    if (!saveName.trim()) return;
    try {
      await saveAsTemplate.mutateAsync(saveName.trim());
      toast.success('Template saved');
      setSaveName('');
      setShowSaveName(false);
    } catch {
      toast.error('Failed to save template');
    }
  }

  // ── Account management ──────────────────────────────────────────
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwPending, setPwPending] = useState(false);

  const [emailNew, setEmailNew] = useState('');
  const [emailPw, setEmailPw] = useState('');
  const [emailPending, setEmailPending] = useState(false);

  const [deleteModal, setDeleteModal] = useState(false);
  const [googleLinking, setGoogleLinking] = useState(false);
  const [googleUnlinking, setGoogleUnlinking] = useState(false);

  async function submitPassword(e: FormEvent) {
    e.preventDefault();
    if (pwNew !== pwConfirm) { toast.error('New passwords do not match'); return; }
    if (pwNew.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setPwPending(true);
    try {
      await api.patch('/auth/me/password', { currentPassword: pwCurrent, newPassword: pwNew });
      toast.success('Password updated');
      setPwCurrent(''); setPwNew(''); setPwConfirm('');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setPwPending(false);
    }
  }

  async function handleGoogleLink(idToken: string) {
    setGoogleLinking(true);
    try {
      const { data } = await api.post('/auth/google/link', { idToken });
      setUser(data);
      toast.success('Google account linked');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setGoogleLinking(false);
    }
  }

  async function handleGoogleUnlink() {
    setGoogleUnlinking(true);
    try {
      const { data } = await api.delete('/auth/google/link');
      setUser(data);
      toast.success('Google account unlinked');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setGoogleUnlinking(false);
    }
  }

  async function submitEmail(e: FormEvent) {
    e.preventDefault();
    setEmailPending(true);
    try {
      const { data } = await api.patch('/auth/me/email', { newEmail: emailNew.trim(), password: emailPw });
      setUser(data);
      toast.success('Email updated');
      setEmailNew(''); setEmailPw('');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setEmailPending(false);
    }
  }

  const savingsNum = parseFloat(savings) || 0;
  const totalAllocated = buckets?.reduce((s, b) => s + b.monthlyLimit, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-base-content">Settings</h1>
        <p className="text-sm text-base-content/50">Manage your profile, budget and account</p>
      </div>

      {/* ── Profile & budget ── */}
      <section className="rounded-xl border border-base-300 bg-base-100 p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-base-content">
          <User size={15} /> Profile &amp; budget
        </h2>
        <form onSubmit={submitProfile} className="space-y-4">
          <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />

          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Pay</label>
            <div className="flex gap-2">
              <Field as="select" className="w-36 flex-shrink-0"
                value={payFreq} onChange={(e) => handleFreqChange(e.target.value as PayFreq)}>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
              </Field>
              <div className="flex-1">
                <Field type="number" step="0.01" min="0" icon={<DollarSign size={13} />}
                  value={payAmount} onChange={(e) => setPayAmount(e.target.value)}
                  placeholder={payFreq === 'weekly' ? 'per week' : payFreq === 'biweekly' ? 'per 2 weeks' : 'per month'} />
              </div>
            </div>
            {payFreq !== 'monthly' && payNum > 0 && (
              <p className="mt-1.5 text-xs" style={{ color: 'var(--color-success)' }}>
                = <span className="font-semibold">{money(salaryNum)}/month</span> budget baseline
              </p>
            )}
            <p className="mt-1 text-xs" style={{ color: 'var(--color-text-faint)' }}>
              Your income baseline — all budgets are calculated monthly.
            </p>
          </div>

          <Field label="Monthly savings goal" type="number" step="0.01" min="0"
            icon={<PiggyBank size={13} />}
            value={savings} onChange={(e) => setSavings(e.target.value)}
            hint={<>Reserved before spending. Leaves <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{money(Math.max(0, salaryNum - savingsNum))}</span> to allocate.</>}
          />

          <Field as="select" label="Currency" value={currency} onChange={(e) => setCurrencyState(e.target.value)}
            hint="Used for all money values across the app.">
            {CURRENCIES.map(({ code, label }) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </Field>

          <button type="submit" disabled={update.isPending}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-content hover:opacity-90 disabled:opacity-50 transition">
            {update.isPending
              ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              : <Check size={14} />}
            Save changes
          </button>
        </form>
      </section>

      {/* ── Budget categories ── */}
      <section className="rounded-xl border border-base-300 bg-base-100 p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-base-content">
            <Tag size={15} /> Budget categories
          </h2>
          <div className="flex items-center gap-2">
            {totalAllocated > 0 && salaryNum > 0 && (
              <span className={`text-xs ${totalAllocated + savingsNum > salaryNum ? 'text-amber-500' : 'text-base-content/40'}`}>
                {money(Math.max(0, salaryNum - savingsNum - totalAllocated))} headroom
              </span>
            )}
            <button type="button" onClick={() => seedBuckets.mutate()} disabled={seedBuckets.isPending}
              className="flex items-center gap-1.5 rounded-lg border border-base-300 px-3 py-1.5 text-xs font-medium text-base-content/60 hover:bg-base-200 disabled:opacity-40 transition">
              {seedBuckets.isPending
                ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                : <Plus size={11} />}
              Load defaults
            </button>
          </div>
        </div>

        {orderedBuckets.length > 0 && (
          <ul className="mb-4 overflow-hidden rounded-xl border border-base-300">
            {orderedBuckets.map((b, idx) =>
              editId === b._id ? (
                <li key={b._id} className="border-b border-base-200 bg-primary/5 px-4 py-3 last:border-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <input autoFocus className="min-w-[8rem] flex-1 rounded-lg px-3 py-1.5 text-sm"
                      value={editName} onChange={(e) => setEditName(e.target.value)} />
                    <div className="relative w-32">
                      <DollarSign size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-base-content/40" />
                      <input type="number" step="0.01" min="0" placeholder="Limit"
                        className="w-full rounded-lg py-1.5 pl-7 pr-3 text-sm"
                        value={editLimit} onChange={(e) => setEditLimit(e.target.value)} />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_COLORS.map((c) => (
                        <button key={c} type="button" onClick={() => setEditColor(c)}
                          className={`h-5 w-5 rounded-full transition ${editColor === c ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => saveEdit(b._id)} disabled={updateBucket.isPending}
                      className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-content hover:opacity-90 disabled:opacity-50">
                      <Check size={11} /> Save
                    </button>
                    <button onClick={() => setEditId(null)}
                      className="flex items-center gap-1 rounded-lg border border-base-300 px-3 py-1.5 text-xs text-base-content/60 hover:bg-base-200">
                      <X size={11} /> Cancel
                    </button>
                  </div>
                </li>
              ) : (
                <li
                  key={b._id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(idx)}
                  className="flex items-center justify-between gap-3 border-b border-base-200 px-4 py-3 last:border-0"
                  style={{ transition: 'opacity 0.15s' }}
                >
                  <GripVertical
                    size={14}
                    className="flex-shrink-0"
                    style={{ color: 'var(--color-text-faint)', cursor: 'grab' }}
                  />
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: b.color }} />
                    <span className="font-medium text-base-content truncate">{b.name}</span>
                    {b.monthlyLimit > 0 && (
                      <span className="rounded-full bg-base-200 px-2 py-0.5 text-xs text-base-content/60">{money(b.monthlyLimit)}/mo</span>
                    )}
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <span className={`text-xs font-medium ${b.remaining < 0 ? 'text-red-500' : 'text-base-content/40'}`}>
                      {b.remaining < 0 ? `${money(-b.remaining)} over` : `${money(b.spent)} spent`}
                    </span>
                    <button onClick={() => startEdit(b)} className="rounded-lg p-1.5 text-base-content/30 hover:bg-base-200 hover:text-primary transition">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setDeleteTarget({ id: b._id, name: b.name })}
                      className="rounded-lg p-1.5 text-base-content/30 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950 transition">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </li>
              )
            )}
          </ul>
        )}

        <form onSubmit={submitNewCategory} className="rounded-xl border border-dashed border-base-300 p-4 space-y-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-base-content/40">
            <Plus size={11} /> Add category
          </p>
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[10rem]">
              <Tag size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
              <input required className={`${inp} pl-8`} placeholder="Category name"
                value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="relative w-36">
              <DollarSign size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
              <input type="number" step="0.01" min="0" className={`${inp} pl-8`} placeholder="Monthly limit"
                value={newLimit} onChange={(e) => setNewLimit(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setNewColor(c)}
                  className={`h-5 w-5 rounded-full transition ${newColor === c ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
            <button type="submit" disabled={addBucket.isPending || !newName.trim()}
              className="ml-auto flex items-center gap-1.5 rounded-lg bg-base-content px-3 py-1.5 text-xs font-semibold text-base-100 hover:opacity-80 disabled:opacity-40 transition">
              <Plus size={12} /> Add
            </button>
          </div>
        </form>
      </section>

      {/* ── Budget templates ── */}
      <section className="rounded-xl border border-base-300 bg-base-100 p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-base-content">
            <LayoutTemplate size={15} /> Budget templates
          </h2>
          {!showSaveName && (
            <button type="button" onClick={() => setShowSaveName(true)}
              className="flex items-center gap-1.5 rounded-lg border border-base-300 px-3 py-1.5 text-xs font-medium text-base-content/60 hover:bg-base-200 transition">
              <Plus size={11} /> Save current as template
            </button>
          )}
        </div>

        {showSaveName && (
          <div className="mb-4 flex gap-2">
            <input
              autoFocus
              placeholder="Template name"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveAsTemplate(); if (e.key === 'Escape') { setShowSaveName(false); setSaveName(''); }}}
              className="flex-1 rounded-lg px-3 py-2 text-sm"
              style={{ backgroundColor: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)', color: 'var(--color-input-text)' }}
            />
            <button onClick={handleSaveAsTemplate} disabled={saveAsTemplate.isPending || !saveName.trim()}
              className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-content hover:opacity-90 disabled:opacity-40 transition">
              {saveAsTemplate.isPending ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Check size={11} />}
              Save
            </button>
            <button onClick={() => { setShowSaveName(false); setSaveName(''); }}
              className="rounded-lg border border-base-300 px-3 py-1.5 text-xs text-base-content/60 hover:bg-base-200 transition">
              <X size={11} />
            </button>
          </div>
        )}

        {templates && templates.length > 0 ? (
          <ul className="overflow-hidden rounded-xl border border-base-300">
            {templates.map((tpl) => (
              <li key={tpl._id} className="border-b border-base-200 last:border-0">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-base-content truncate">{tpl.name}</p>
                    <p className="text-xs text-base-content/40">{tpl.categories.length} categor{tpl.categories.length !== 1 ? 'ies' : 'y'}</p>
                  </div>
                  <button
                    onClick={() => setConfirmApplyId(confirmApplyId === tpl._id ? null : tpl._id)}
                    className="rounded-lg border border-base-300 px-3 py-1.5 text-xs font-medium text-base-content/60 hover:bg-base-200 transition">
                    Apply
                  </button>
                  <button
                    onClick={() => deleteTemplate.mutate(tpl._id)}
                    disabled={deleteTemplate.isPending}
                    className="rounded-lg p-1.5 text-base-content/30 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950 transition">
                    <Trash2 size={13} />
                  </button>
                </div>
                {confirmApplyId === tpl._id && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-base-200 bg-amber-50 dark:bg-amber-950/20 px-4 py-2.5">
                    <p className="flex-1 text-xs text-amber-700 dark:text-amber-400">This will replace all your current categories. Confirm?</p>
                    <button
                      onClick={() => applyTemplate.mutate(tpl._id, { onSuccess: () => setConfirmApplyId(null) })}
                      disabled={applyTemplate.isPending}
                      className="flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50 transition">
                      {applyTemplate.isPending ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Check size={11} />}
                      Confirm
                    </button>
                    <button onClick={() => setConfirmApplyId(null)}
                      className="rounded-lg border border-base-300 px-3 py-1 text-xs text-base-content/60 hover:bg-base-200 transition">
                      Cancel
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-base-content/40">
            No templates yet. Save your current categories as a template to reuse them.
          </p>
        )}
      </section>

      {/* ── Change password ── */}
      <section className="rounded-xl border border-base-300 bg-base-100 p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-base-content">
          <Lock size={15} /> Change password
        </h2>
        <form onSubmit={submitPassword} className="space-y-3">
          <Field type="password" required label="Current password" value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)} placeholder="••••••••" />
          <div className="grid grid-cols-2 gap-3">
            <Field type="password" required label="New password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} placeholder="••••••••" />
            <Field type="password" required label="Confirm new password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} placeholder="••••••••" />
          </div>
          <button type="submit" disabled={pwPending || !pwCurrent || !pwNew || !pwConfirm}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-content hover:opacity-90 disabled:opacity-50 transition">
            {pwPending ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Check size={14} />}
            Update password
          </button>
        </form>
      </section>

      {/* ── Change email ── */}
      <section className="rounded-xl border border-base-300 bg-base-100 p-5 shadow-sm">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-base-content">
          <Mail size={15} /> Change email
        </h2>
        <p className="mb-4 text-xs text-base-content/40">Current: <span className="font-medium text-base-content">{user?.email}</span></p>
        <form onSubmit={submitEmail} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field type="email" required label="New email" value={emailNew} onChange={(e) => setEmailNew(e.target.value)} placeholder="new@email.com" />
            <Field type="password" required label="Confirm with password" value={emailPw} onChange={(e) => setEmailPw(e.target.value)} placeholder="••••••••" />
          </div>
          <button type="submit" disabled={emailPending || !emailNew || !emailPw}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-content hover:opacity-90 disabled:opacity-50 transition">
            {emailPending ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Check size={14} />}
            Update email
          </button>
        </form>
      </section>

      {/* ── Linked accounts ── */}
      <section className="rounded-xl border border-base-300 bg-base-100 p-5 shadow-sm">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-base-content">
          <Link2 size={15} /> Linked accounts
        </h2>
        <p className="mb-4 text-xs text-base-content/40">
          Link your Google account to sign in without a password.
        </p>
        {user?.googleId ? (
          <div className="flex items-center justify-between rounded-lg px-4 py-3"
            style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Google</p>
                <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>Connected</p>
              </div>
            </div>
            <button
              onClick={handleGoogleUnlink}
              disabled={googleUnlinking}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:opacity-80 disabled:opacity-50"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
            >
              {googleUnlinking
                ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                : <Link2Off size={12} />}
              Unlink
            </button>
          </div>
        ) : (
          <div>
            {googleLinking && (
              <p className="mb-2 text-xs" style={{ color: 'var(--color-text-faint)' }}>Linking…</p>
            )}
            <GoogleButton
              onSuccess={handleGoogleLink}
              onError={(msg) => toast.error(msg)}
            />
          </div>
        )}
      </section>

      {/* ── Danger zone ── */}
      <section className="rounded-xl border border-red-200 bg-base-100 p-5 shadow-sm dark:border-red-900/40">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-red-600 dark:text-red-400">
          <ShieldAlert size={15} /> Danger zone
        </h2>
        <p className="mb-4 text-xs text-base-content/50">
          Permanently delete your account and all data. This cannot be undone.
        </p>
        <button type="button" onClick={() => setDeleteModal(true)}
          className="flex items-center gap-1.5 rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/50 transition">
          <Trash2 size={14} /> Delete my account
        </button>
      </section>

      {/* ── Modals ── */}
      {deleteTarget && (
        <ConfirmModal
          icon={<AlertTriangle size={20} style={{ color: 'var(--color-error)' }} />}
          iconBg="rgba(220,38,38,0.1)"
          title={`Delete "${deleteTarget.name}"?`}
          body={<>This will permanently delete the category and <span className="font-semibold">all expenses recorded under it</span>. This cannot be undone.</>}
          confirmLabel="Yes, delete"
          confirmStyle={{ backgroundColor: 'var(--color-error)', color: '#fff' }}
          isPending={deleteBucket.isPending}
          onConfirm={() => deleteBucket.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {deleteModal && (
        <DeleteAccountModal
          onDone={() => { logout(); }}
          onCancel={() => setDeleteModal(false)}
        />
      )}
    </div>
  );
}

/* ── Shared confirm modal ── */
function ConfirmModal({ icon, iconBg, title, body, confirmLabel, confirmStyle, isPending, onConfirm, onCancel }: {
  icon: React.ReactNode; iconBg: string; title: string; body: React.ReactNode;
  confirmLabel: string; confirmStyle: React.CSSProperties;
  isPending: boolean; onConfirm: () => void; onCancel: () => void;
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
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: iconBg }}>
          {icon}
        </div>
        <h3 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>{title}</h3>
        <p className="mt-1.5 text-sm" style={{ color: 'var(--color-text-muted)' }}>{body}</p>
        <div className="mt-5 flex gap-3">
          <button ref={cancelRef} onClick={onCancel}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition hover:opacity-80"
            style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={isPending}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition hover:opacity-90 disabled:opacity-50"
            style={confirmStyle}>
            {isPending && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {isPending ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Delete account modal (needs password input) ── */
function DeleteAccountModal({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onCancel]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      await api.delete('/auth/me', { data: { password } });
      onDone();
    } catch (err) {
      toast.error(apiErrorMessage(err));
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.currentTarget === e.target) onCancel(); }}>
      <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(220,38,38,0.1)' }}>
          <ShieldAlert size={20} style={{ color: 'var(--color-error)' }} />
        </div>
        <h3 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>Delete account?</h3>
        <p className="mt-1.5 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          This will permanently erase your account, all categories, expenses, income, and recurring rules. <span className="font-semibold">There is no undo.</span>
        </p>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <Field type="password" required autoFocus label="Enter your password to confirm"
            value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          <div className="flex gap-3">
            <button ref={cancelRef} type="button" onClick={onCancel}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition hover:opacity-80"
              style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
              Cancel
            </button>
            <button type="submit" disabled={pending || !password}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-error)', color: '#fff' }}>
              {pending && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {pending ? 'Deleting…' : 'Delete everything'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
