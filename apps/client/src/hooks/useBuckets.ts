import { useQuery } from '@tanstack/react-query';
import type { BucketWithSpend } from '@dwexpense/types';
import { api } from '../lib/api';

export function useBuckets() {
  return useQuery({
    queryKey: ['buckets'],
    queryFn: async () => {
      const { data } = await api.get<BucketWithSpend[]>('/buckets');
      return data;
    },
  });
}
