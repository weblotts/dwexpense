import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { SavingsGoal, CreateSavingsGoalInput, UpdateSavingsGoalInput } from '@dwexpense/types';
import { api } from '../lib/api';

export function useSavingsGoals() {
  return useQuery({
    queryKey: ['savings-goals'],
    queryFn: async () => {
      const { data } = await api.get<SavingsGoal[]>('/savings-goals');
      return data;
    },
  });
}

export function useAddSavingsGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSavingsGoalInput) => {
      const { data } = await api.post<SavingsGoal>('/savings-goals', input);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['savings-goals'] }),
  });
}

export function useUpdateSavingsGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateSavingsGoalInput }) => {
      const { data } = await api.patch<SavingsGoal>(`/savings-goals/${id}`, input);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['savings-goals'] }),
  });
}

export function useDeleteSavingsGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/savings-goals/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['savings-goals'] }),
  });
}
