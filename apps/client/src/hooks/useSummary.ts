import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type { MonthlySummary } from '@dwexpense/types';
import { api } from '../lib/api';

export function useSummary(month?: string) {
  return useQuery({
    queryKey: ['summary', month ?? 'current'],
    queryFn: async () => {
      const { data } = await api.get<MonthlySummary>('/summary', {
        params: month ? { month } : undefined,
      });
      return data;
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useSummaryMonths() {
  return useQuery({
    queryKey: ['summary-months'],
    queryFn: async () => {
      const { data } = await api.get<string[]>('/summary/months');
      return data;
    },
    staleTime: 60_000,
  });
}
