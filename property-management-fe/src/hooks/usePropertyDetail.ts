import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { PropertyDetail, UpdatePropertyInput } from '../lib/types';

export function usePropertyDetail(propertyId: string) {
  return useQuery<PropertyDetail>({
    queryKey: ['propertyDetail', propertyId],
    queryFn: async () => (await api.getPropertyDetail(propertyId)).data,
    enabled: Boolean(propertyId),
  });
}

export function usePropertyUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePropertyInput }) =>
      api.updateProperty(id, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['propertyDetail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });
}
