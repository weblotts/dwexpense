import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { Bucket, CreateBucketInput } from '@dwexpense/types';
import { api, apiErrorMessage } from '../lib/api';

export function useAddBucket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBucketInput) => {
      const { data } = await api.post<Bucket>('/buckets', input);
      return data;
    },
    onSuccess: (bucket) => {
      qc.invalidateQueries({ queryKey: ['buckets'] });
      toast.success(`Added "${bucket.name}"`);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}
