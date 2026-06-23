import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { CreateIncomeInput, Income } from '@dwexpense/types';
import { api, apiErrorMessage } from '../lib/api';

export function useIncome(month?: string) {
  return useQuery({
    queryKey: ['income', month ?? 'current'],
    queryFn: async () => {
      const { data } = await api.get<Income[]>('/income', {
        params: month ? { month } : {},
      });
      return data;
    },
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.refetchQueries({ queryKey: ['summary'] });
  qc.refetchQueries({ queryKey: ['buckets'] });
  qc.invalidateQueries({ queryKey: ['income'] });
  qc.invalidateQueries({ queryKey: ['summary-months'] });
}

export function useAddIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateIncomeInput) => {
      const { data } = await api.post<Income>('/income', input);
      return data;
    },
    onSuccess: () => {
      invalidate(qc);
      toast.success('Income added');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

export function useDeleteIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/income/${id}`);
      return id;
    },
    onSuccess: () => {
      invalidate(qc);
      toast.success('Income removed');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}
