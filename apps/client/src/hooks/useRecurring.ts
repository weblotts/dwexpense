import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { CreateRecurringInput, Recurring, UpdateRecurringInput } from '@dwexpense/types';
import { api, apiErrorMessage } from '../lib/api';

export function useRecurring() {
  return useQuery({
    queryKey: ['recurring'],
    queryFn: async () => {
      const { data } = await api.get<Recurring[]>('/recurring');
      return data;
    },
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['recurring'] });
  qc.invalidateQueries({ queryKey: ['summary'] });
}

export function useAddRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateRecurringInput) => {
      const { data } = await api.post<Recurring>('/recurring', input);
      return data;
    },
    onSuccess: () => {
      invalidate(qc);
      toast.success('Recurring rule added');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

export function useUpdateRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateRecurringInput }) => {
      const { data } = await api.patch<Recurring>(`/recurring/${id}`, input);
      return data;
    },
    onSuccess: () => invalidate(qc),
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

export function useDeleteRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/recurring/${id}`);
      return id;
    },
    onSuccess: () => {
      invalidate(qc);
      toast.success('Recurring rule removed');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}
