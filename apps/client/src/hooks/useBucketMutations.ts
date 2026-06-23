import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { Bucket, UpdateBucketInput } from '@dwexpense/types';
import { api, apiErrorMessage } from '../lib/api';

export function useUpdateBucket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateBucketInput }) => {
      const { data } = await api.patch<Bucket>(`/buckets/${id}`, input);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['buckets'] }),
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

export function useSeedBuckets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ created: number }>('/buckets/seed');
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['buckets'] }),
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

export function useDeleteBucket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/buckets/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['buckets'] });
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['summary'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}
