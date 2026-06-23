import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { NetWorthSnapshot, CreateNetWorthInput, UpdateNetWorthInput } from '@dwexpense/types';
import { api } from '../lib/api';

export function useNetWorth() {
  return useQuery({
    queryKey: ['net-worth'],
    queryFn: async () => {
      const { data } = await api.get<NetWorthSnapshot[]>('/net-worth');
      return data;
    },
  });
}

export function useAddNetWorthSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateNetWorthInput) => {
      const { data } = await api.post<NetWorthSnapshot>('/net-worth', input);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['net-worth'] }),
  });
}

export function useUpdateNetWorthSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateNetWorthInput }) => {
      const { data } = await api.patch<NetWorthSnapshot>(`/net-worth/${id}`, input);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['net-worth'] }),
  });
}

export function useDeleteNetWorthSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/net-worth/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['net-worth'] }),
  });
}
