import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { UpdateWhatsAppSettingsInput } from '../lib/types';

export function useWhatsappStatus() {
  return useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: async () => (await api.getWhatsappStatus()).whatsapp_enabled,
  });
}

export function useWhatsappSetup() {
  return useQuery({
    queryKey: ['whatsapp-setup'],
    queryFn: async () => (await api.getWhatsappSetup()).data.settings,
  });
}

export function useUpdateWhatsappSetup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateWhatsAppSettingsInput) => api.updateWhatsappSetup(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-setup'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
    },
  });
}
