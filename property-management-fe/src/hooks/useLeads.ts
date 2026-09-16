import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type ListLeadsParams } from '../lib/api';

export function useLeads(params: ListLeadsParams) {
  return useQuery({
    queryKey: ['leads', params],
    queryFn: async () => (await api.getLeads(params)).data,
  });
}

export function useToggleLeadAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (leadId: string) => api.toggleLeadAgent(leadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
