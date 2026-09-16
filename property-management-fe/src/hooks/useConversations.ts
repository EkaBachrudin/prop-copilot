import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type ListConversationsParams } from '../lib/api';
import type { CreateConversationInput, UpdateConversationInput } from '../lib/types';

export function useConversations(params: ListConversationsParams) {
  return useQuery({
    queryKey: ['conversations', params],
    queryFn: async () => (await api.getConversations(params)).data,
  });
}

export function useConversationMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['conversations'] });

  const createConversation = useMutation({
    mutationFn: (input: CreateConversationInput) => api.createConversation(input),
    onSuccess: invalidate,
  });

  const updateConversation = useMutation({
    mutationFn: (input: UpdateConversationInput) => api.updateConversation(input),
    onSuccess: invalidate,
  });

  const clearConversation = useMutation({
    mutationFn: (conversationId: string) => api.clearConversation(conversationId),
    onSuccess: (_data, conversationId) => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    },
  });

  const deleteConversation = useMutation({
    mutationFn: (conversationId: string) => api.deleteConversation(conversationId),
    onSuccess: invalidate,
  });

  return {
    createConversation,
    updateConversation,
    clearConversation,
    deleteConversation,
    isCreating: createConversation.isPending,
    isUpdating: updateConversation.isPending,
    isClearing: clearConversation.isPending,
    isDeleting: deleteConversation.isPending,
  };
}
