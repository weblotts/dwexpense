import { useQuery } from '@tanstack/react-query';
import type { Expense, ExpenseFilters } from '@dwexpense/types';
import { api } from '../lib/api';

export function expensesKey(filters: ExpenseFilters) {
  return ['expenses', filters.bucketId ?? 'all', filters.month ?? 'current'] as const;
}

export function useExpenses(filters: ExpenseFilters = {}) {
  return useQuery({
    queryKey: expensesKey(filters),
    queryFn: async () => {
      const { data } = await api.get<Expense[]>('/expenses', {
        params: {
          ...(filters.bucketId ? { bucketId: filters.bucketId } : {}),
          ...(filters.month ? { month: filters.month } : {}),
        },
      });
      return data;
    },
  });
}
