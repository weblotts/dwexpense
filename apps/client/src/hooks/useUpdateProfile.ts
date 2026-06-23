import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { UpdateProfileInput, User } from '@dwexpense/types';
import { api, apiErrorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export function useUpdateProfile() {
  const qc = useQueryClient();
  const { setUser } = useAuth();
  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      const { data } = await api.patch<User>('/auth/me', input);
      return data;
    },
    onSuccess: (user) => {
      setUser(user);
      qc.invalidateQueries({ queryKey: ['summary'] });
      toast.success('Saved');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}
