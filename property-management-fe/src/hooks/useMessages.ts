import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { SendMessageInput, SimulateMessageInput } from '../lib/types';

export function useMessages(conversationId: string, page = 1, limit = 100) {
  return useQuery({
    queryKey: ['messages', conversationId, page, limit],
    queryFn: async () =>
      (await api.getMessages({ conversation_id: conversationId, page, limit })).data,
    enabled: Boolean(conversationId),
  });
}

export function useMessageMutations() {
  const queryClient = useQueryClient();

  const invalidate = (conversationId?: string) => {
    queryClient.invalidateQueries({ queryKey: ['messages'] });
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    if (conversationId) {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    }
  };

  const sendMessage = useMutation({
    mutationFn: (input: SendMessageInput) => api.sendMessage(input),
    onSuccess: (_data, variables) => invalidate(variables.conversation_id),
  });

  const simulateMessage = useMutation({
    mutationFn: (input: SimulateMessageInput) => api.simulateMessage(input),
    onSuccess: (data) => invalidate(data.data.conversation.id),
  });

  return {
    sendMessage,
    simulateMessage,
    isSending: sendMessage.isPending,
    isSimulating: simulateMessage.isPending,
  };
}
