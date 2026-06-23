import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { BudgetTemplate } from '@dwexpense/types';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

export function useBudgetTemplates() {
  return useQuery({
    queryKey: ['budget-templates'],
    queryFn: async () => {
      const { data } = await api.get<BudgetTemplate[]>('/budget-templates');
      return data;
    },
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string }) => {
      const { data } = await api.post<BudgetTemplate>('/budget-templates', input);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budget-templates'] }),
  });
}

export function useApplyTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/budget-templates/${id}/apply`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['buckets'] });
      qc.invalidateQueries({ queryKey: ['budget-templates'] });
      toast.success('Template applied — buckets updated');
    },
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/budget-templates/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budget-templates'] }),
  });
}

export function useSaveCurrentAsTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data } = await api.post<BudgetTemplate>('/budget-templates/from-current', { name });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budget-templates'] }),
  });
}
