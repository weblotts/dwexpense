import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../lib/api';

interface ApplyResult {
  createdExpenses: number;
  createdIncome: number;
}

/** Materialise due recurring rules into this month — call on dashboard load. */
export function useApplyRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<ApplyResult>('/recurring/apply', {});
      return data;
    },
    onSuccess: (r) => {
      const n = r.createdExpenses + r.createdIncome;
      if (n > 0) {
        qc.invalidateQueries({ queryKey: ['summary'] });
        qc.invalidateQueries({ queryKey: ['buckets'] });
        qc.invalidateQueries({ queryKey: ['expenses'] });
        qc.invalidateQueries({ queryKey: ['income'] });
        toast.success(`Applied ${n} recurring item${n > 1 ? 's' : ''} for this month`);
      }
    },
  });
}
