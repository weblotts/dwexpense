import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { Expense } from '@dwexpense/types';
import { api, apiErrorMessage } from '../lib/api';

export function useDeleteExpense() {
  const qc = useQueryClient();

  async function doRestore(id: string, toastId: string) {
    toast.dismiss(toastId);
    try {
      await api.post(`/expenses/${id}/restore`);
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['summary'] });
      qc.invalidateQueries({ queryKey: ['buckets'] });
      qc.invalidateQueries({ queryKey: ['summary-months'] });
      toast.success('Expense restored');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/expenses/${id}`);
      return id;
    },
    // Optimistic removal across all cached expense lists.
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ['expenses'] });
      const snapshots = qc.getQueriesData<Expense[]>({ queryKey: ['expenses'] });
      snapshots.forEach(([key, list]) => {
        if (list) qc.setQueryData(key, list.filter((e) => e._id !== id));
      });
      return { snapshots };
    },
    onError: (err, _id, ctx) => {
      ctx?.snapshots.forEach(([key, list]) => qc.setQueryData(key, list));
      toast.error(apiErrorMessage(err));
    },
    onSuccess: (id) => {
      toast(
        (t) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14 }}>Expense deleted</span>
            <button
              onClick={() => doRestore(id, t.id)}
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--color-primary)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Undo
            </button>
          </div>
        ),
        { duration: 5000 }
      );
    },
    onSettled: () => {
      qc.refetchQueries({ queryKey: ['summary'] });
      qc.refetchQueries({ queryKey: ['buckets'] });
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['summary-months'] });
    },
  });
}

export function useRestoreExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/expenses/${id}/restore`);
      return id;
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
    onSuccess: () => {
      toast.success('Expense restored');
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['summary'] });
      qc.invalidateQueries({ queryKey: ['buckets'] });
      qc.invalidateQueries({ queryKey: ['summary-months'] });
    },
  });
}
