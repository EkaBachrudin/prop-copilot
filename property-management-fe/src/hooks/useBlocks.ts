import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useBlockMutations(propertyId: string) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['propertyDetail', propertyId] });
    queryClient.invalidateQueries({ queryKey: ['properties'] });
  };

  const createBlock = useMutation({
    mutationFn: (name: string) => api.createBlock(propertyId, { name }),
    onSuccess: invalidate,
  });

  const updateBlock = useMutation({
    mutationFn: ({ blockId, name }: { blockId: string; name: string }) =>
      api.updateBlock(blockId, { name }),
    onSuccess: invalidate,
  });

  const deleteBlock = useMutation({
    mutationFn: (blockId: string) => api.deleteBlock(blockId),
    onSuccess: invalidate,
  });

  return {
    createBlock,
    updateBlock,
    deleteBlock,
    isCreating: createBlock.isPending,
    isUpdating: updateBlock.isPending,
    isDeleting: deleteBlock.isPending,
  };
}
