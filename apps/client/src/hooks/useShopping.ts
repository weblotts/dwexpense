import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ShoppingList,
  ShoppingItem,
  CreateShoppingListInput,
  UpdateShoppingListInput,
  ConvertShoppingListInput,
  CreateShoppingItemInput,
  UpdateShoppingItemInput,
  CheckShoppingItemInput,
  ReorderShoppingItemsInput,
  ShoppingItemFrequency,
} from '@dwexpense/types';
import { api } from '../lib/api';

export function useShoppingLists() {
  return useQuery({
    queryKey: ['shopping-lists'],
    queryFn: async () => {
      const { data } = await api.get<ShoppingList[]>('/shopping/lists');
      return data;
    },
  });
}

export function useShoppingItems(listId: string | null) {
  return useQuery({
    queryKey: ['shopping-items', listId],
    queryFn: async () => {
      const { data } = await api.get<ShoppingItem[]>(`/shopping/lists/${listId}/items`);
      return data;
    },
    enabled: !!listId,
  });
}

export function useAddShoppingList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateShoppingListInput) => {
      const { data } = await api.post<ShoppingList>('/shopping/lists', input);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping-lists'] }),
  });
}

export function useDeleteShoppingList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (listId: string) => {
      await api.delete(`/shopping/lists/${listId}`);
      return listId;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping-lists'] }),
  });
}

export function useUpdateShoppingList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateShoppingListInput & { id: string }) => {
      const { data } = await api.patch<ShoppingList>(`/shopping/lists/${id}`, input);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping-lists'] }),
  });
}

export function useConvertShoppingList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: ConvertShoppingListInput & { id: string }) => {
      const { data } = await api.post<{ list: ShoppingList; expense: unknown }>(
        `/shopping/lists/${id}/convert`,
        input
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shopping-lists'] });
      qc.invalidateQueries({ queryKey: ['buckets'] });
      qc.invalidateQueries({ queryKey: ['summary'] });
    },
  });
}

export function useDuplicateShoppingList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (listId: string) => {
      const { data } = await api.post<ShoppingList>(`/shopping/lists/${listId}/duplicate`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping-lists'] }),
  });
}

export function useReorderShoppingItems(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ReorderShoppingItemsInput) => {
      const { data } = await api.patch<ShoppingItem[]>(`/shopping/lists/${listId}/items/reorder`, input);
      return data;
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: ['shopping-items', listId] });
      const previous = qc.getQueryData<ShoppingItem[]>(['shopping-items', listId]);
      if (previous) {
        const byId = new Map(previous.map((i) => [i._id, i]));
        const reordered = input.itemIds.map((id) => byId.get(id)).filter(Boolean) as ShoppingItem[];
        const rest = previous.filter((i) => !input.itemIds.includes(i._id));
        qc.setQueryData(['shopping-items', listId], [...reordered, ...rest]);
      }
      return { previous };
    },
    onError: (_err, _input, context) => {
      if (context?.previous) qc.setQueryData(['shopping-items', listId], context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['shopping-items', listId] }),
  });
}

export function useShoppingFrequency() {
  return useQuery({
    queryKey: ['shopping-frequency'],
    queryFn: async () => {
      const { data } = await api.get<ShoppingItemFrequency[]>('/shopping/frequency');
      return data;
    },
  });
}

export function useAddShoppingItem(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateShoppingItemInput) => {
      const { data } = await api.post<ShoppingItem>(`/shopping/lists/${listId}/items`, input);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping-items', listId] }),
  });
}

export function useUpdateShoppingItem(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateShoppingItemInput & { id: string }) => {
      const { data } = await api.patch<ShoppingItem>(`/shopping/items/${id}`, input);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping-items', listId] }),
  });
}

export function useDeleteShoppingItem(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      await api.delete(`/shopping/items/${itemId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping-items', listId] }),
  });
}

export function useCheckShoppingItem(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: CheckShoppingItemInput & { id: string }) => {
      const { data } = await api.post<{ item: ShoppingItem; expense: unknown | null }>(
        `/shopping/items/${id}/check`,
        input
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shopping-items', listId] });
      qc.invalidateQueries({ queryKey: ['buckets'] });
      qc.invalidateQueries({ queryKey: ['summary'] });
    },
  });
}
