import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { CreateExpenseInput, Expense } from '@dwexpense/types';
import { api, apiErrorMessage } from '../lib/api';

export function useAddExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateExpenseInput) => {
      const { data } = await api.post<Expense>('/expenses', input);
      return data;
    },
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['summary'] });
      qc.refetchQueries({ queryKey: ['buckets'] });
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['summary-months'] });
      toast.success('Expense added');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}
