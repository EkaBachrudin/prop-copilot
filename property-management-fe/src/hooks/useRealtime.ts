import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { connectSocket, disconnectSocket } from '../lib/socket';
import type { Message } from '../lib/types';

/** Subscribes to the backend Socket.IO stream and refreshes affected queries. */
export function useRealtime(enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const socket = connectSocket();

    const onMessage = (message: Message) => {
      queryClient.invalidateQueries({ queryKey: ['messages', message.conversation_id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    };

    const onConversationChange = () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    };

    socket.on('message:new', onMessage);
    socket.on('conversation:updated', onConversationChange);
    socket.on('conversation:new', onConversationChange);

    return () => {
      socket.off('message:new', onMessage);
      socket.off('conversation:updated', onConversationChange);
      socket.off('conversation:new', onConversationChange);
      disconnectSocket();
    };
  }, [enabled, queryClient]);
}
