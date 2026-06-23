import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../lib/api';

export function useMigrateSubscriptions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ migrated: number; message: string }>('/migrate/subscriptions').then((r) => r.data),
    onSuccess: (data) => {
      if (data.migrated > 0) {
        toast.success(`Migrated ${data.migrated} subscription${data.migrated > 1 ? 's' : ''} to recurring rules`);
        qc.invalidateQueries({ queryKey: ['recurring'] });
      } else {
        toast('No subscriptions to migrate');
      }
    },
    onError: () => toast.error('Migration failed'),
  });
}
