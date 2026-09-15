import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type ListPropertiesParams } from '../lib/api';
import type { CreatePropertyInput, UpdatePropertyInput } from '../lib/types';

type ErrorHandler = (error: Error) => void;

export function useProperties(params: ListPropertiesParams) {
  return useQuery({
    queryKey: ['properties', params],
    queryFn: async () => (await api.getProperties(params)).data,
  });
}

interface PropertyMutationOptions {
  onError?: ErrorHandler;
}

export function usePropertyMutations(options?: PropertyMutationOptions) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['properties'] });

  const createProperty = useMutation({
    mutationFn: (input: CreatePropertyInput) => api.createProperty(input),
    onSuccess: invalidate,
    onError: options?.onError,
  });

  const updateProperty = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePropertyInput }) =>
      api.updateProperty(id, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['propertyDetail', variables.id] });
    },
    onError: options?.onError,
  });

  const deleteProperty = useMutation({
    mutationFn: (id: string) => api.deleteProperty(id),
    onSuccess: invalidate,
    onError: options?.onError,
  });

  return {
    createProperty,
    updateProperty,
    deleteProperty,
    isCreating: createProperty.isPending,
    isUpdating: updateProperty.isPending,
    isDeleting: deleteProperty.isPending,
  };
}
